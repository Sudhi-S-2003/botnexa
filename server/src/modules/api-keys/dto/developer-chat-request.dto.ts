import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeveloperChatRequestDto {
  @ApiPropertyOptional({
    description: 'API version identifier',
    example: 'v1',
    default: 'v1',
  })
  @IsOptional()
  @IsString()
  @Matches(/^v1$/, { message: 'Only version "v1" is currently supported' })
  version?: string = 'v1';

  @ApiPropertyOptional({
    description: 'Workspace API Key Secret (Optional if provided in Authorization header or x-api-secret)',
    example: 'bn_live_a1b2c3d4e5f6...',
  })
  @IsOptional()
  @IsString()
  apiKeySecret?: string;

  @ApiProperty({
    description: 'UUID of the target assistant to query',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'assistantId must be a valid UUID' })
  assistantId: string;

  @ApiProperty({
    description: 'User message to send to the assistant',
    example: 'What is your refund and support policy?',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Optional conversation ID to maintain chat history thread',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'conversationId must be a valid UUID' })
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Whether to stream the response (future capability)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stream?: boolean = false;
}
