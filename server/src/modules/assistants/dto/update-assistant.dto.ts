import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { AssistantAccessPolicy, AssistantStatus } from '../../../types/assistant.type.js';

export class UpdateAssistantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxOutputTokens?: number;

  @ApiProperty({ enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], required: false })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: AssistantStatus;

  @ApiProperty({ enum: ['PUBLIC', 'PRIVATE'], required: false })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE'])
  accessPolicy?: AssistantAccessPolicy;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  allowedDomains?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  rateLimitPerMinute?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  contextIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;
}
