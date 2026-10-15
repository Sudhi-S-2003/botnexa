import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { UserEntity } from '../../entities/user.entity.js';
import { WorkspaceEntity } from '../../entities/workspace.entity.js';
import { WorkspaceMemberEntity } from '../../entities/workspace-member.entity.js';
import { WalletEntity } from '../../entities/wallet.entity.js';
import { WalletTransactionEntity } from '../../entities/wallet-transaction.entity.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      WorkspaceEntity,
      WorkspaceMemberEntity,
      WalletEntity,
      WalletTransactionEntity,
    ]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'botnexa_super_secure_jwt_secret_key_2026_xyz987654321'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
