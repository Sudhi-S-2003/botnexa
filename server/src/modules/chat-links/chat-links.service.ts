import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { ChatLinkEntity } from '../../entities/chat-link.entity.js';
import { AssistantEntity } from '../../entities/assistant.entity.js';
import { WorkspaceEntity } from '../../entities/workspace.entity.js';
import { WorkspaceMemberEntity } from '../../entities/workspace-member.entity.js';
import { CreateChatLinkDto } from './dto/create-chat-link.dto.js';
import { DEFAULT_JWT_SECRET, type JwtPayload } from '../../types/auth.type.js';
import type { ChatLinkPermission } from '../../types/chat.type.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX32_REGEX = /^[0-9a-f]{32}$/i;

function parseSlugCandidates(rawSlug: string): { textSlugs: string[]; uuidCandidates: string[] } {
  const decoded = decodeURIComponent(rawSlug || '').trim();
  const textSlugs: Set<string> = new Set();
  const uuidCandidates: Set<string> = new Set();

  if (decoded) {
    textSlugs.add(decoded);
    if (UUID_REGEX.test(decoded)) {
      uuidCandidates.add(decoded.toLowerCase());
    }

    // Handle spaces or underscores replacing hyphens: e.g. "f6821bf2 91b7 4493 8211 749885dd23d2"
    const hyphenated = decoded.replace(/[\s_]+/g, '-');
    if (hyphenated !== decoded) {
      textSlugs.add(hyphenated);
      if (UUID_REGEX.test(hyphenated)) {
        uuidCandidates.add(hyphenated.toLowerCase());
      }
    }

    // Handle 32-char hex without hyphens
    if (HEX32_REGEX.test(decoded)) {
      const formatted = `${decoded.slice(0, 8)}-${decoded.slice(8, 12)}-${decoded.slice(12, 16)}-${decoded.slice(16, 20)}-${decoded.slice(20)}`.toLowerCase();
      if (UUID_REGEX.test(formatted)) {
        uuidCandidates.add(formatted);
      }
    }
  }

  return {
    textSlugs: Array.from(textSlugs).filter(Boolean),
    uuidCandidates: Array.from(uuidCandidates),
  };
}

@Injectable()
export class ChatLinksService {
  constructor(
    @InjectRepository(ChatLinkEntity)
    private readonly linkRepo: Repository<ChatLinkEntity>,
    @InjectRepository(AssistantEntity)
    private readonly assistantRepo: Repository<AssistantEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepo: Repository<WorkspaceEntity>,
    @InjectRepository(WorkspaceMemberEntity)
    private readonly memberRepo: Repository<WorkspaceMemberEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async createChatLink(workspaceId: string, dto: CreateChatLinkDto) {
    let assistant = UUID_REGEX.test(dto.assistantId)
      ? await this.assistantRepo.findOne({
          where: { id: dto.assistantId, workspaceId },
        })
      : null;

    if (!assistant) {
      assistant = await this.assistantRepo.findOne({
        where: { slug: dto.assistantId, workspaceId },
      });
    }

    if (!assistant) {
      throw new NotFoundException('Assistant not found in this workspace');
    }

    const baseSlug = (dto.slug || assistant.name).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

    // Verify slug uniqueness
    const existing = await this.linkRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('Slug already taken, please choose another');
    }

    const isProtected = dto.mode === 'PROTECTED';
    const secretToken = isProtected ? crypto.randomBytes(24).toString('hex') : null;

    const link = this.linkRepo.create({
      workspaceId,
      assistantId: assistant.id,
      slug,
      mode: dto.mode || 'PUBLIC',
      secretToken,
      allowedOrigins: dto.allowedOrigins || [],
      rateLimitPerMinute: dto.rateLimitPerMinute || 30,
      isActive: true,
    });

    return await this.linkRepo.save(link);
  }

  async getChatLinks(workspaceId: string) {
    return await this.linkRepo.find({
      where: { workspaceId },
      relations: { assistant: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getLinkForAssistant(workspaceId: string, assistantId: string) {
    let targetAssistantId = assistantId;
    if (!UUID_REGEX.test(assistantId)) {
      const asst = await this.assistantRepo.findOne({
        where: { slug: assistantId, workspaceId },
      });
      if (asst) {
        targetAssistantId = asst.id;
      }
    }

    let link = UUID_REGEX.test(targetAssistantId)
      ? await this.linkRepo.findOne({
          where: { workspaceId, assistantId: targetAssistantId, isActive: true },
          relations: { assistant: true },
        })
      : null;

    if (!link) {
      link = await this.createChatLink(workspaceId, {
        assistantId: targetAssistantId,
        mode: 'PUBLIC',
      });
    }

    const tokenQuery = link.mode === 'PROTECTED' && link.secretToken ? `?token=${link.secretToken}` : '';

    return {
      id: link.id,
      slug: link.slug,
      isPublic: link.mode === 'PUBLIC',
      isProtected: link.mode === 'PROTECTED',
      isPrivate: link.mode === 'PRIVATE',
      mode: link.mode,
      url: `/chat/${link.slug}${tokenQuery}`,
      fullUrl: `https://botnexa.onrender.com/chat/${link.slug}${tokenQuery}`,
      secretToken: link.secretToken,
    };
  }

  async resolvePublicLink(slug: string, secretToken?: string, authHeader?: string) {
    const { textSlugs, uuidCandidates } = parseSlugCandidates(slug);

    // 1. Try finding active link by slug, assistantId, or link ID
    const linkWhere: Array<Record<string, any>> = [];

    // Query varchar slug column with text candidates
    for (const s of textSlugs) {
      linkWhere.push({ slug: s, isActive: true });
    }

    // Query uuid columns ONLY with valid UUID candidates (never non-uuid text!)
    for (const uid of uuidCandidates) {
      linkWhere.push(
        { assistantId: uid, isActive: true },
        { id: uid, isActive: true },
        { slug: uid, isActive: true },
      );
    }

    let link = linkWhere.length > 0
      ? await this.linkRepo.findOne({
          where: linkWhere,
          relations: { assistant: true, workspace: true },
        })
      : null;

    // 2. If no active link exists, check if identifier corresponds to an assistant
    if (!link) {
      const assistantWhere: Array<Record<string, any>> = [];
      for (const s of textSlugs) {
        assistantWhere.push({ slug: s });
      }
      for (const uid of uuidCandidates) {
        assistantWhere.push({ id: uid }, { slug: uid });
      }

      const assistant = assistantWhere.length > 0
        ? await this.assistantRepo.findOne({
            where: assistantWhere,
          })
        : null;

      if (assistant) {
        // Auto-provision public chat link for this assistant
        link = await this.createChatLink(assistant.workspaceId, {
          assistantId: assistant.id,
          mode: 'PUBLIC',
        });
        link.assistant = assistant;
      }
    }

    if (!link) {
      throw new NotFoundException('Chat link not found or has been disabled');
    }

    const isPublic = link.mode === 'PUBLIC';
    const isProtected = link.mode === 'PROTECTED';
    const isPrivate = link.mode === 'PRIVATE';

    let requiresAuth = isPrivate;
    let requiresToken = false;
    let userPermission: ChatLinkPermission = isPublic ? 'chat' : 'none';
    let authenticatedUser: { userId: string; email: string; role?: string } | null = null;

    // A. Protected Link Verification (Pre-shared URL Token Gate)
    if (isProtected) {
      if (secretToken && secretToken === link.secretToken) {
        userPermission = 'chat';
        requiresToken = false;
      } else {
        userPermission = 'none';
        requiresToken = true;
      }
    }

    // B. Private Link Verification (Identity-gated with Workspace RBAC)
    if (isPrivate) {
      let extractedToken: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        extractedToken = authHeader.substring(7).trim();
      }

      if (extractedToken) {
        try {
          const secret = this.configService.get<string>('JWT_SECRET') || DEFAULT_JWT_SECRET;
          const payload = await this.jwtService.verifyAsync<JwtPayload>(extractedToken, { secret });
          const userId = payload.sub;
          const email = payload.email;

          // Check workspace ownership first
          const workspace = link.workspace || await this.workspaceRepo.findOne({ where: { id: link.workspaceId } });
          if (workspace && workspace.ownerId === userId) {
            userPermission = 'chat';
            authenticatedUser = { userId, email, role: 'OWNER' };
            requiresAuth = false;
          } else {
            // Check workspace membership
            const member = await this.memberRepo.findOne({
              where: { workspaceId: link.workspaceId, userId },
            });

            if (member) {
              authenticatedUser = { userId, email, role: member.role };
              requiresAuth = false;
              if (['OWNER', 'ADMIN', 'EDITOR', 'MEMBER'].includes(member.role)) {
                userPermission = 'chat';
              } else if (member.role === 'VIEWER') {
                userPermission = 'view';
              } else {
                userPermission = 'none';
              }
            } else {
              authenticatedUser = { userId, email, role: 'NON_MEMBER' };
              userPermission = 'none';
              requiresAuth = false;
            }
          }
        } catch {
          // Token invalid or expired
          requiresAuth = true;
          userPermission = 'none';
        }
      } else {
        requiresAuth = true;
        userPermission = 'none';
      }
    }

    const asst = link.assistant || ({} as any);

    return {
      chatLinkId: link.id,
      slug: link.slug,
      mode: link.mode,
      isPublic,
      isProtected,
      isPrivate,
      requiresAuth,
      requiresToken,
      userPermission,
      authenticatedUser,
      name: asst.name || 'BotNexa Assistant',
      description: asst.description || '',
      welcomeMessage: asst.welcomeMessage || 'Hello! How can I assist you today?',
      avatarUrl: asst.avatarUrl,
      workspaceId: link.workspaceId || asst.workspaceId,
      assistant: {
        id: asst.id,
        name: asst.name,
        description: asst.description,
        avatarUrl: asst.avatarUrl,
        welcomeMessage: asst.welcomeMessage || 'Hello! How can I assist you today?',
        workspaceId: asst.workspaceId,
      },
    };
  }

  async revokeChatLink(workspaceId: string, id: string) {
    if (!UUID_REGEX.test(id)) throw new NotFoundException('Chat link not found');
    const link = await this.linkRepo.findOne({ where: { id, workspaceId } });
    if (!link) throw new NotFoundException('Chat link not found');

    link.isActive = false;
    return await this.linkRepo.save(link);
  }

  async deleteChatLink(workspaceId: string, id: string) {
    if (!UUID_REGEX.test(id)) throw new NotFoundException('Chat link not found');
    const link = await this.linkRepo.findOne({ where: { id, workspaceId } });
    if (!link) throw new NotFoundException('Chat link not found');

    await this.linkRepo.remove(link);
    return { success: true, message: 'Chat link permanently deleted' };
  }
}
