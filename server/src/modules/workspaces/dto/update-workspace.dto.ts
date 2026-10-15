import { IsOptional, IsString, MaxLength, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { WorkspaceSettings } from '../../../types/workspace.type.js';

export class UpdateWorkspaceDto {
  @ApiProperty({ example: 'Growth & Marketing', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: WorkspaceSettings;
}
