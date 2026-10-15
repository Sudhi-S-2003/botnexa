import {
  IsNotEmpty,
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

export class CreateAssistantDto {
  @ApiProperty({ example: 'Customer Support Bot' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Answers customer inquiries based on documentation', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Hello! How can I assist you today?', required: false })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiProperty({ example: 'You are a helpful and polite assistant for Acme Corp.', required: false })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({ example: 'gemini', required: false })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({ example: 'gemini-3.5-flash-lite', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ example: 0.7, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiProperty({ example: 2048, required: false })
  @IsOptional()
  @IsNumber()
  maxOutputTokens?: number;

  @ApiProperty({ example: 'PUBLIC', enum: ['PUBLIC', 'PRIVATE'], required: false })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PRIVATE'])
  accessPolicy?: AssistantAccessPolicy;

  @ApiProperty({ example: [], required: false })
  @IsOptional()
  @IsArray()
  contextIds?: string[];

  @ApiProperty({ example: 'Instructions alias', required: false })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({ example: 2048, required: false })
  @IsOptional()
  @IsNumber()
  maxTokens?: number;

  @ApiProperty({ example: 'PUBLISHED', required: false })
  @IsOptional()
  status?: AssistantStatus;
}
