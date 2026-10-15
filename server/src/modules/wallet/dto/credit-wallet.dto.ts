import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreditWalletDto {
  @ApiProperty({ example: 10000, description: 'Amount in minor units (e.g. 10000 paise = ₹100.00)', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amountMinorUnits?: number;

  @ApiProperty({ example: 10000, description: 'Alias for amountMinorUnits', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amountMinor?: number;

  @ApiProperty({ example: 'admin-topup-001', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;
}

