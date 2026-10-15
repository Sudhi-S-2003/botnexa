import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { ContextType } from '../../../types/context.type.js';

export class CreateContextDto {
  @ApiProperty({ example: 'Return Policy' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Standard 30-day refund and exchange terms', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'TEXT', enum: ['DOCUMENT', 'FAQ', 'TEXT', 'JSON', 'URL'], required: false })
  @IsOptional()
  @IsEnum(['DOCUMENT', 'FAQ', 'TEXT', 'JSON', 'URL'])
  type?: ContextType;

  @ApiProperty({ example: 'Customers can return items within 30 days of purchase for a full refund.', required: false })
  @IsOptional()
  @IsString()
  rawContent?: string;

  @ApiProperty({ example: 'Alias for rawContent', required: false })
  @IsOptional()
  @IsString()
  rawText?: string;
}
