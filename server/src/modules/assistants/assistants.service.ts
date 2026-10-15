import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AssistantEntity } from '../../entities/assistant.entity.js';
import { ContextEntity } from '../../entities/context.entity.js';
import { CreateAssistantDto } from './dto/create-assistant.dto.js';
import { UpdateAssistantDto } from './dto/update-assistant.dto.js';

@Injectable()
export class AssistantsService {
  constructor(
    @InjectRepository(AssistantEntity)
    private readonly assistantRepo: Repository<AssistantEntity>,
    @InjectRepository(ContextEntity)
    private readonly contextRepo: Repository<ContextEntity>,
  ) {}

  private formatAssistant(a: AssistantEntity): any {
    return {
      ...a,
      instructions: a.systemPrompt,
      isPublic: a.accessPolicy === 'PUBLIC',
      temperature: a.modelParameters?.temperature ?? 0.7,
      maxTokens: a.modelParameters?.maxOutputTokens ?? 2048,
      status: (a.status || 'published').toLowerCase(),
    };
  }

  async createAssistant(workspaceId: string, dto: CreateAssistantDto) {
    const baseSlug = dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    // Resolve assigned contexts if provided
    let contexts: ContextEntity[] = [];
    if (dto.contextIds && dto.contextIds.length > 0) {
      contexts = await this.contextRepo.find({
        where: { id: In(dto.contextIds), workspaceId },
      });
    }

    const systemPrompt = dto.systemPrompt || dto.instructions || 'You are a helpful and polite business AI assistant.';
    const accessPolicy = dto.accessPolicy || (dto.isPublic !== undefined ? (dto.isPublic ? 'PUBLIC' : 'PRIVATE') : 'PUBLIC');
    const maxOutputTokens = dto.maxOutputTokens ?? dto.maxTokens ?? 2048;

    const assistant = this.assistantRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description || '',
      slug,
      welcomeMessage: dto.welcomeMessage || 'Hello! How can I assist you today?',
      systemPrompt,
      provider: dto.provider || 'gemini',
      model: dto.model || 'gemini-3.5-flash-lite',
      modelParameters: {
        temperature: dto.temperature ?? 0.7,
        maxOutputTokens,
      },
      status: dto.status || 'PUBLISHED',
      accessPolicy,
      contexts,
    });

    const saved = await this.assistantRepo.save(assistant);
    return this.formatAssistant(saved);
  }

  async getAssistants(workspaceId: string) {
    let list = await this.assistantRepo.find({
      where: { workspaceId },
      relations: { contexts: true },
      order: { createdAt: 'DESC' },
    });

    // Auto-seed a default assistant if workspace is brand new
    if (list.length === 0) {
      const defaultAsst = this.assistantRepo.create({
        workspaceId,
        name: 'BotNexa Customer AI',
        description: 'Default multi-tenant intelligent customer support agent.',
        slug: `botnexa-support-${Math.random().toString(36).substring(2, 6)}`,
        welcomeMessage: 'Hello! I am your BotNexa AI Assistant. How can I help you today?',
        systemPrompt: 'You are a professional, helpful and courteous AI assistant for BotNexa SaaS.',
        provider: 'gemini',
        model: 'gemini-3.5-flash-lite',
        modelParameters: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
        status: 'PUBLISHED',
        accessPolicy: 'PUBLIC',
        contexts: [],
      });
      const saved = await this.assistantRepo.save(defaultAsst);
      list = [saved];
    }

    return list.map((a) => this.formatAssistant(a));
  }

  async getAssistantById(workspaceId: string, id: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const assistant = isUuid
      ? await this.assistantRepo.findOne({
          where: { id, workspaceId },
          relations: { contexts: true, chatLinks: true },
        })
      : await this.assistantRepo.findOne({
          where: { slug: id, workspaceId },
          relations: { contexts: true, chatLinks: true },
        });

    if (!assistant) {
      throw new NotFoundException('Assistant not found in this workspace');
    }

    return this.formatAssistant(assistant);
  }

  async updateAssistant(workspaceId: string, id: string, dto: UpdateAssistantDto) {
    const assistant = await this.getAssistantById(workspaceId, id);

    if (dto.name) assistant.name = dto.name;
    if (dto.description !== undefined) assistant.description = dto.description;
    if (dto.avatarUrl !== undefined) assistant.avatarUrl = dto.avatarUrl;
    if (dto.welcomeMessage !== undefined) assistant.welcomeMessage = dto.welcomeMessage;
    if (dto.systemPrompt !== undefined) assistant.systemPrompt = dto.systemPrompt;
    if (dto.provider) assistant.provider = dto.provider;
    if (dto.model) assistant.model = dto.model;
    if (dto.status) assistant.status = dto.status;
    if (dto.accessPolicy) assistant.accessPolicy = dto.accessPolicy;
    if (dto.allowedDomains) assistant.allowedDomains = dto.allowedDomains;
    if (dto.rateLimitPerMinute !== undefined) assistant.rateLimitPerMinute = dto.rateLimitPerMinute;

    if (dto.temperature !== undefined || dto.maxOutputTokens !== undefined) {
      assistant.modelParameters = {
        ...assistant.modelParameters,
        ...(dto.temperature !== undefined ? { temperature: dto.temperature } : {}),
        ...(dto.maxOutputTokens !== undefined ? { maxOutputTokens: dto.maxOutputTokens } : {}),
      };
    }

    if (dto.contextIds) {
      assistant.contexts = await this.contextRepo.find({
        where: { id: In(dto.contextIds), workspaceId },
      });
    }

    return await this.assistantRepo.save(assistant);
  }

  async publishAssistant(workspaceId: string, id: string) {
    const assistant = await this.getAssistantById(workspaceId, id);
    assistant.status = 'PUBLISHED';
    return await this.assistantRepo.save(assistant);
  }

  async deleteAssistant(workspaceId: string, id: string) {
    const assistant = await this.getAssistantById(workspaceId, id);
    await this.assistantRepo.remove(assistant);
    return { success: true, message: 'Assistant deleted successfully' };
  }
}
