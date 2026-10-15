import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production Webhook Key' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: [], description: 'Allowed assistant UUIDs (empty = all in workspace)', required: false })
  @IsOptional()
  @IsArray()
  allowedAssistantIds?: string[];

  @ApiProperty({ example: ['chat', 'conversations'], required: false })
  @IsOptional()
  @IsArray()
  scopes?: string[];
}
