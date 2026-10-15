import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsArray,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmbedTokenDto {
  @ApiPropertyOptional({
    description: 'API version identifier',
    example: 'v1',
    default: 'v1',
  })
  @IsOptional()
  @IsString()
  @Matches(/^v1$/, { message: 'Only version "v1" is currently supported' })
  version?: string = 'v1';

  @ApiProperty({
    description: 'UUID of the assistant to generate the embed token for',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'assistantId must be a valid UUID' })
  assistantId: string;

  @ApiPropertyOptional({
    description: 'Expiry time in seconds from creation. Default 86400 (24 hours). Max 2592000 (30 days).',
    example: 86400,
    default: 86400,
  })
  @IsOptional()
  @IsInt()
  @Min(60, { message: 'expiresInSeconds must be at least 60 seconds (1 minute)' })
  @Max(2592000, { message: 'expiresInSeconds cannot exceed 2592000 seconds (30 days)' })
  expiresInSeconds?: number = 86400;

  @ApiPropertyOptional({
    description: 'Optional list of allowed domains/origins that can embed this widget',
    example: ['https://example.com', 'https://shop.example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrigins?: string[];
}
