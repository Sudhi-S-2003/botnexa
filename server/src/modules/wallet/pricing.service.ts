import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingConfigEntity } from '../../entities/pricing-config.entity.js';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingConfigEntity)
    private readonly pricingRepo: Repository<PricingConfigEntity>,
  ) {}

  /**
   * Estimate maximum potential cost for a chat completion in integer minor units (paise)
   */
  estimateMaxCost(model: string, maxOutputTokens: number = 2048): number {
    // Generous buffer: estimated 1,000 prompt tokens + max output tokens
    const estimatedTokens = 1000 + maxOutputTokens;
    // For gemini-3.5-flash-lite, cost is ~0.0001 paise per token.
    // Minimum reservation buffer of 5 paise (5 minor units) ensures sufficient balance.
    const calculated = Math.ceil((estimatedTokens / 1_000_000) * 1000);
    return Math.max(5, calculated);
  }

  /**
   * Calculate exact customer charge in minor units based on actual token counts
   */
  async calculateCharge(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<{ customerCharge: number; providerCost: number; pricingVersion: string }> {
    // Check DB config or fall back to verified default pricing
    const config = await this.pricingRepo.findOne({
      where: { provider, model, isActive: true },
    });

    // Default rates per 1M tokens in paise (100 paise = ₹1.00)
    // Input: 10 paise per 1M tokens, Output: 40 paise per 1M tokens
    const inputCostPerMillion = config ? Number(config.inputTokenCostPerMillion) : 10;
    const outputCostPerMillion = config ? Number(config.outputTokenCostPerMillion) : 40;
    const markupPercent = config ? config.platformMarkupPercent : 20;

    const rawInputCost = (inputTokens / 1_000_000) * inputCostPerMillion;
    const rawOutputCost = (outputTokens / 1_000_000) * outputCostPerMillion;
    const totalProviderCost = rawInputCost + rawOutputCost;

    const markedUpCost = totalProviderCost * (1 + markupPercent / 100);

    // Minor units must be integer; minimum 1 unit (1 paisa) for any successful generation
    const customerCharge = Math.max(1, Math.ceil(markedUpCost));
    const providerCost = Math.max(1, Math.ceil(totalProviderCost));

    return {
      customerCharge,
      providerCost,
      pricingVersion: 'v1',
    };
  }
}
