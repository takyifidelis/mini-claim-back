import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      await this.synchronizeSequences();
      this.logger.log('Prisma connected to database successfully.');
    } catch (error: any) {
      this.logger.error('Failed to connect to database server', error?.message);
      if (process.env.NODE_ENV !== 'test') {
        throw error;
      }
    }
  }

  async synchronizeSequences() {
    try {
      await this.$executeRawUnsafe(
        `SELECT setval('policy_seq', GREATEST((SELECT COUNT(*) FROM policies), 1), true)`
      );
      await this.$executeRawUnsafe(
        `SELECT setval('claim_seq', GREATEST((SELECT COUNT(*) FROM claims), 1), true)`
      );
      await this.$executeRawUnsafe(
        `SELECT setval('fx_sheet_seq', GREATEST((SELECT COUNT(*) FROM exchange_rate_sheets), 1), true)`
      );
    } catch {
      // Ignored if sequences or tables do not exist yet
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Prisma disconnected from database.');
    } catch (err: any) {
      this.logger.warn('Error disconnecting from database', err?.message);
    }
  }

  /**
   * Generates the next sequential reference for an exchange rate sheet: FX-YYYYMMDD-NNNNNN
   *
   * @param date - Effective date (or today) for YYYYMMDD prefix
   * @returns Formatted reference string e.g. "FX-20260905-000001"
   */
  async getNextFxSheetReference(date: Date = new Date()): Promise<string> {
    const yyyy = date.getUTCFullYear().toString();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const datePrefix = `${yyyy}${mm}${dd}`;

    while (true) {
      const result: Array<{ nextval: bigint | number | string }> = await this.$queryRawUnsafe(
        `SELECT nextval('fx_sheet_seq') AS nextval`
      );
      const seq = Number(result[0].nextval);
      const padded = String(seq).padStart(6, '0');
      const ref = `FX-${datePrefix}-${padded}`;
      const existing = await this.exchangeRateSheet.findUnique({ where: { reference: ref } });
      if (!existing) {
        return ref;
      }
    }
  }

  /**
   * Generates the next sequential reference for a policy: POL-YYYY-NNNNNN
   *
   * @param year - Year for reference (defaults to current UTC year)
   * @returns Formatted reference string e.g. "POL-2026-000001"
   */
  async getNextPolicyNumber(year: number = new Date().getUTCFullYear()): Promise<string> {
    while (true) {
      const result: Array<{ nextval: bigint | number | string }> = await this.$queryRawUnsafe(
        `SELECT nextval('policy_seq') AS nextval`
      );
      const seq = Number(result[0].nextval);
      const padded = String(seq).padStart(6, '0');
      const ref = `POL-${year}-${padded}`;
      const existing = await this.policy.findUnique({ where: { policyNumber: ref } });
      if (!existing) {
        return ref;
      }
    }
  }

  /**
   * Generates the next sequential reference for a claim: CLM-YYYY-NNNNNN
   *
   * @param year - Year for reference (defaults to current UTC year)
   * @returns Formatted reference string e.g. "CLM-2026-000001"
   */
  async getNextClaimReference(year: number = new Date().getUTCFullYear()): Promise<string> {
    while (true) {
      const result: Array<{ nextval: bigint | number | string }> = await this.$queryRawUnsafe(
        `SELECT nextval('claim_seq') AS nextval`
      );
      const seq = Number(result[0].nextval);
      const padded = String(seq).padStart(6, '0');
      const ref = `CLM-${year}-${padded}`;
      const existing = await this.claim.findUnique({ where: { claimReference: ref } });
      if (!existing) {
        return ref;
      }
    }
  }
}
