import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Assistant UUID' })
  @IsUUID()
  @IsNotEmpty()
  assistantId: string;

  @ApiProperty({ example: 'How do I return a product?' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ example: 'uuid-conversation-id', required: false })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
