import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { ChatLinkMode } from '../../../types/chat.type.js';

export class CreateChatLinkDto {
  @ApiProperty({ example: 'uuid-assistant-id' })
  @IsUUID()
  @IsNotEmpty()
  assistantId: string;

  @ApiProperty({ example: 'support-agent', required: false })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: 'PUBLIC', enum: ['PUBLIC', 'PROTECTED', 'PRIVATE'], required: false })
  @IsOptional()
  @IsEnum(['PUBLIC', 'PROTECTED', 'PRIVATE'])
  mode?: ChatLinkMode;

  @ApiProperty({ example: ['https://mywebsite.com'], required: false })
  @IsOptional()
  @IsArray()
  allowedOrigins?: string[];

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsNumber()
  rateLimitPerMinute?: number;
}
