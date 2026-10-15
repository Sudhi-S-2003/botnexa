import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { UserRole } from '../../../types/auth.type.js';

export class AddMemberDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MEMBER', enum: ['OWNER', 'ADMIN', 'MEMBER', 'EDITOR', 'VIEWER'] })
  @IsEnum(['OWNER', 'ADMIN', 'MEMBER', 'EDITOR', 'VIEWER'])
  @IsNotEmpty()
  role: UserRole;
}
