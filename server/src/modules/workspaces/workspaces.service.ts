import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { WorkspaceEntity } from '../../entities/workspace.entity.js';
import { WorkspaceMemberEntity } from '../../entities/workspace-member.entity.js';
import { UserEntity } from '../../entities/user.entity.js';
import { WalletEntity } from '../../entities/wallet.entity.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto.js';
import { AddMemberDto } from './dto/add-member.dto.js';
import type { JwtPayload, UserRole } from '../../types/auth.type.js';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepo: Repository<WorkspaceEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly memberRepo: Repository<WorkspaceMemberEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const baseSlug = dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    return await this.dataSource.transaction(async (manager) => {
      const workspace = manager.create(WorkspaceEntity, {
        name: dto.name,
        slug,
        ownerId: userId,
        settings: {
          defaultCurrency: 'INR',
          maxMonthlyBudgetMinorUnits: 500000,
        },
      });
      const savedWorkspace = await manager.save(workspace);

      const membership = manager.create(WorkspaceMemberEntity, {
        workspaceId: savedWorkspace.id,
        userId,
        role: 'OWNER',
      });
      await manager.save(membership);

      const wallet = manager.create(WalletEntity, {
        workspaceId: savedWorkspace.id,
        currency: 'INR',
        balance: 2000, // 2,000 paise starting credit
        reservedAmount: 0,
        status: 'ACTIVE',
      });
      await manager.save(wallet);

      return savedWorkspace;
    });
  }

  async getUserWorkspaces(userId: string) {
    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: { workspace: true },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      createdAt: m.workspace.createdAt,
    }));
  }

  async getWorkspaceById(workspaceId: string, userId: string) {
    const membership = await this.memberRepo.findOne({
      where: { workspaceId, userId },
      relations: { workspace: { wallet: true } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      settings: membership.workspace.settings,
      wallet: membership.workspace.wallet
        ? {
            balanceMinorUnits: Number(membership.workspace.wallet.balance),
            reservedMinorUnits: Number(membership.workspace.wallet.reservedAmount),
            currency: membership.workspace.wallet.currency,
          }
        : null,
      createdAt: membership.workspace.createdAt,
    };
  }

  async updateWorkspace(workspaceId: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    if (dto.name) workspace.name = dto.name;
    if (dto.settings) workspace.settings = { ...workspace.settings, ...dto.settings };

    return await this.workspaceRepo.save(workspace);
  }

  async switchWorkspace(userId: string, targetWorkspaceId: string) {
    const membership = await this.memberRepo.findOne({
      where: { userId, workspaceId: targetWorkspaceId },
      relations: { workspace: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of the requested workspace');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user) {
      user.defaultWorkspaceId = targetWorkspaceId;
      await this.userRepo.save(user);
    }

    const payload: JwtPayload = {
      sub: userId,
      email: user?.email || '',
      workspaceId: targetWorkspaceId,
      role: membership.role,
    };

    const token = this.jwtService.sign(payload);

    return {
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        role: membership.role,
      },
      token,
    };
  }

  async getMembers(workspaceId: string) {
    const members = await this.memberRepo.find({
      where: { workspaceId },
      relations: { user: true },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async addMember(workspaceId: string, dto: AddMemberDto) {
    const targetUser = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!targetUser) {
      throw new NotFoundException(`User with email ${dto.email} not found. They must register first.`);
    }

    const existing = await this.memberRepo.findOne({
      where: { workspaceId, userId: targetUser.id },
    });

    if (existing) {
      throw new ConflictException('User is already a member of this workspace');
    }

    const member = this.memberRepo.create({
      workspaceId,
      userId: targetUser.id,
      role: dto.role,
    });

    await this.memberRepo.save(member);

    return {
      id: member.id,
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: member.role,
    };
  }

  async updateMemberRole(workspaceId: string, memberUserId: string, newRole: string) {
    const validRoles = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'];
    const normalizedRole = newRole.toUpperCase() as UserRole;
    if (!validRoles.includes(normalizedRole)) {
      throw new BadRequestException(`Invalid role: ${newRole}. Must be one of ${validRoles.join(', ')}`);
    }

    const membership = await this.memberRepo.findOne({
      where: { workspaceId, userId: memberUserId },
      relations: { user: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace member not found');
    }

    if (membership.role === 'OWNER' && normalizedRole !== 'OWNER') {
      const ownerCount = await this.memberRepo.count({
        where: { workspaceId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot demote the sole owner of the workspace');
      }
    }

    membership.role = normalizedRole;
    await this.memberRepo.save(membership);

    return {
      id: membership.id,
      userId: membership.userId,
      email: membership.user?.email,
      name: membership.user?.name,
      role: membership.role,
    };
  }

  async removeMember(workspaceId: string, memberUserId: string, requestingUserId: string) {
    const membership = await this.memberRepo.findOne({
      where: { workspaceId, userId: memberUserId },
    });

    if (!membership) {
      throw new NotFoundException('Workspace member not found');
    }

    if (membership.role === 'OWNER') {
      const ownerCount = await this.memberRepo.count({
        where: { workspaceId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the sole owner of the workspace');
      }
    }

    await this.memberRepo.remove(membership);
    return { success: true, message: 'Member removed from workspace successfully' };
  }
}
