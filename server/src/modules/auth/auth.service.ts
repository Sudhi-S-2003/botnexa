import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { UserEntity } from '../../entities/user.entity.js';
import { WorkspaceEntity } from '../../entities/workspace.entity.js';
import { WorkspaceMemberEntity } from '../../entities/workspace-member.entity.js';
import { WalletEntity } from '../../entities/wallet.entity.js';
import { WalletTransactionEntity } from '../../entities/wallet-transaction.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { JwtPayload, UserRole } from '../../types/auth.type.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepo: Repository<WorkspaceEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly memberRepo: Repository<WorkspaceMemberEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Atomic transaction creating User, Default Workspace, Membership, and Wallet with trial credits
    return await this.dataSource.transaction(async (manager) => {
      // 1. Create User
      const user = manager.create(UserEntity, {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        isEmailVerified: true,
      });
      const savedUser = await manager.save(user);

      // 2. Create Workspace
      const workspaceName = dto.workspaceName || `${dto.name.split(' ')[0]}'s Workspace`;
      const baseSlug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
      const uniqueSuffix = Math.random().toString(36).substring(2, 7);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      const workspace = manager.create(WorkspaceEntity, {
        name: workspaceName,
        slug,
        ownerId: savedUser.id,
        settings: {
          defaultCurrency: 'INR',
          maxMonthlyBudgetMinorUnits: 500000,
        },
      });
      const savedWorkspace = await manager.save(workspace);

      // 3. Update User default workspace
      savedUser.defaultWorkspaceId = savedWorkspace.id;
      await manager.save(savedUser);

      // 4. Add Owner Membership
      const membership = manager.create(WorkspaceMemberEntity, {
        workspaceId: savedWorkspace.id,
        userId: savedUser.id,
        role: 'OWNER',
      });
      await manager.save(membership);

      // 5. Initialize Wallet with initial test credits (5000 paise = ₹50.00)
      const wallet = manager.create(WalletEntity, {
        workspaceId: savedWorkspace.id,
        currency: 'INR',
        balance: 5000,
        reservedAmount: 0,
        status: 'ACTIVE',
      });
      const savedWallet = await manager.save(wallet);

      // Record welcome bonus transaction
      const transaction = manager.create(WalletTransactionEntity, {
        workspaceId: savedWorkspace.id,
        walletId: savedWallet.id,
        type: 'CREDIT',
        amountMinorUnits: 5000,
        currency: 'INR',
        referenceId: 'welcome-grant',
        idempotencyKey: `welcome-${savedWorkspace.id}`,
        metadata: {
          description: 'Welcome trial credit grant',
          openingBalance: 0,
          balanceAfter: 5000,
          status: 'succeeded',
        },
      });
      await manager.save(transaction);

      // Generate JWT Token
      const token = this.generateToken(savedUser.id, savedUser.email, savedWorkspace.id, 'OWNER');

      return {
        user: {
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name,
        },
        workspace: {
          id: savedWorkspace.id,
          name: savedWorkspace.name,
          slug: savedWorkspace.slug,
          role: 'OWNER',
        },
        token,
        accessToken: token,
      };
    });
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Resolve workspace & role
    const memberships = await this.memberRepo.find({
      where: { userId: user.id },
      relations: { workspace: true },
    });

    if (memberships.length === 0) {
      throw new NotFoundException('No active workspaces found for this user');
    }

    // Default to the first or designated workspace
    const primary = memberships.find((m) => m.workspaceId === user.defaultWorkspaceId) || memberships[0];

    const token = this.generateToken(user.id, user.email, primary.workspaceId, primary.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      workspace: {
        id: primary.workspace.id,
        name: primary.workspace.name,
        slug: primary.workspace.slug,
        role: primary.role,
      },
      token,
      accessToken: token,
    };
  }

  async getProfile(userId: string, currentWorkspaceId?: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const memberships = await this.memberRepo.find({
      where: { userId },
      relations: { workspace: true },
    });

    const activeMembership = currentWorkspaceId
      ? memberships.find((m) => m.workspaceId === currentWorkspaceId)
      : memberships[0];

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      currentWorkspace: activeMembership
        ? {
            id: activeMembership.workspace.id,
            name: activeMembership.workspace.name,
            slug: activeMembership.workspace.slug,
            role: activeMembership.role,
          }
        : null,
      workspaces: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
      })),
    };
  }

  private generateToken(userId: string, email: string, workspaceId: string, role: UserRole): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      workspaceId,
      role,
    };
    return this.jwtService.sign(payload);
  }
}
