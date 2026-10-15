import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service.js';
import { CreditWalletDto } from './dto/credit-wallet.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../types/auth.type.js';

@ApiTags('Wallet & Billing')
@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get current workspace wallet balance and available funds' })
  async getBalance(@CurrentUser() user: AuthenticatedUser) {
    return await this.walletService.getBalance(user.workspaceId);
  }

  @Post('topup')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Credit workspace wallet (Owner/Admin only)' })
  async topup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreditWalletDto,
  ) {
    const amount = Number(dto.amountMinorUnits || dto.amountMinor || 5000);
    const ref = dto.referenceId || `topup-${Date.now()}`;
    return await this.walletService.creditWallet(
      user.workspaceId,
      amount,
      ref,
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get wallet transaction history ledger' })
  async getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    return await this.walletService.getTransactions(user.workspaceId, limit ? Number(limit) : 50);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get token usage and billing records' })
  async getUsage(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ) {
    return await this.walletService.getUsageRecords(user.workspaceId, limit ? Number(limit) : 50);
  }
}
