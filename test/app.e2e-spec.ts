import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

describe('Mini Claims Register Backend E2E Workflow', () => {
  let app: INestApplication;
  let pgliteDb: PGlite;

  beforeAll(async () => {
    // 1. Initialize in-process PostgreSQL engine and apply real migration SQL
    pgliteDb = new PGlite();
    const migrationSqlPath = path.resolve('prisma/migrations/20260905000000_init/migration.sql');
    const sql = fs.readFileSync(migrationSqlPath, 'utf8');
    await pgliteDb.exec(sql);

    // 2. Initialize Nest Application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useFactory({
        factory: () => {
          const service = new PrismaService();
          // Route raw queries to PGlite instance for testing
          service.$queryRawUnsafe = async (query: string, ...values: any[]) => {
            const res = await pgliteDb.query(query, values);
            return res.rows as any;
          };
          return service;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transform: true,
      })
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check Endpoint', () => {
    it('GET /api/v1/health returns application liveness and database readiness', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        statusCode: 200,
        message: 'Request successful.',
      });
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.checks.database.status).toBe('up');
    });
  });

  describe('Complete 10-Step Domain Workflow', () => {
    let riskCoverId1: string;
    let riskCoverId2: string;
    let rateSheet1Id: string;
    let policyId: string;
    let policyCoverId1: string;
    let claimId: string;

    // Step 1: Create and list Risk Covers
    it('Step 1: Create risk covers and list them with pagination', async () => {
      // Create Accidental Damage
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/risk-covers')
        .send({
          code: 'ACC_DAM',
          name: 'Accidental Damage',
          description: 'Covers physical damages',
          status: 'ACTIVE',
        });
      expect(res1.status).toBe(201);
      expect(res1.body.data.code).toBe('ACC_DAM');
      riskCoverId1 = res1.body.data.id;

      // Create Goods in Transit
      const res2 = await request(app.getHttpServer())
        .post('/api/v1/risk-covers')
        .send({
          code: 'GIT_COV',
          name: 'Goods in Transit',
          description: 'Covers transport damages',
          status: 'ACTIVE',
        });
      expect(res2.status).toBe(201);
      riskCoverId2 = res2.body.data.id;

      // Duplicate code rejection
      const dupRes = await request(app.getHttpServer())
        .post('/api/v1/risk-covers')
        .send({
          code: 'ACC_DAM',
          name: 'Duplicate Accidental Damage',
          description: 'Duplicate',
        });
      expect(dupRes.status).toBe(409);
      expect(dupRes.body).toMatchObject({
        success: false,
        statusCode: 409,
        message: 'Risk cover with code "ACC_DAM" already exists.',
        data: { code: 'CONFLICT' },
      });

      // List risk covers
      const listRes = await request(app.getHttpServer())
        .get('/api/v1/risk-covers?page=1&pageSize=10&search=ACC_DAM')
        .expect(200);
      expect(listRes.body.data.items.length).toBe(1);
      expect(listRes.body.data.items[0].code).toBe('ACC_DAM');
    });

    // Step 2: Create complete immutable Exchange Rate Sheet from canonical GHS base rates
    it('Step 2: Create immutable exchange rate sheet and retrieve current active sheet', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/exchange-rate-sheets')
        .send({
          effectiveAt: '2026-01-01T00:00:00.000Z',
          notes: 'Q1 2026 Test Rates',
          usdToGhsRate: '12.5000',
          eurToGhsRate: '13.3333',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.reference).toMatch(/^FX-20260101-\d{6}$/);
      expect(res.body.data.entries.length).toBe(6);
      rateSheet1Id = res.body.data.id;

      // Duplicate effectiveAt rejection
      const dupRes = await request(app.getHttpServer())
        .post('/api/v1/exchange-rate-sheets')
        .send({
          effectiveAt: '2026-01-01T00:00:00.000Z',
          usdToGhsRate: '12.5000',
          eurToGhsRate: '13.3333',
        });
      expect(dupRes.status).toBe(409);

      // Missing canonical base rate rejection
      const incRes = await request(app.getHttpServer())
        .post('/api/v1/exchange-rate-sheets')
        .send({
          effectiveAt: '2026-02-01T00:00:00.000Z',
          usdToGhsRate: '12.5000',
        });
      expect(incRes.status).toBe(400);

      // Check GET /current
      const curRes = await request(app.getHttpServer()).get('/api/v1/exchange-rate-sheets/current');
      expect(curRes.status).toBe(200);
      expect(curRes.body.data.id).toBe(rateSheet1Id);
    });

    // Step 3: Create Policy with assigned covers and locked rate sheet
    it('Step 3: Create policy, verify locked rate sheet, and view detail', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          insuredName: 'Apex Haulage Ltd',
          policyType: 'Commercial Transit',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          currency: 'USD',
          sumInsured: '500000.00',
          premiumAmount: '12000.00',
          covers: [
            {
              riskCoverId: riskCoverId1,
              coverageLimit: '200000.00',
              deductibleAmount: '5000.00',
              terms: 'Collision and overturn',
            },
            {
              riskCoverId: riskCoverId2,
              coverageLimit: '300000.00',
              deductibleAmount: '10000.00',
              terms: 'Theft in transit',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.policyNumber).toMatch(/^POL-2026-\d{6}$/);
      expect(res.body.data.exchangeRateSheetId).toBe(rateSheet1Id);
      expect(res.body.data.covers.length).toBe(2);
      expect(res.body.data.sumInsured).toBe('500000.00');

      policyId = res.body.data.id;
      policyCoverId1 = res.body.data.covers[0].id;

      // Invalid date range rejection (startDate > endDate)
      const badDateRes = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({
          insuredName: 'Bad Date Policy',
          policyType: 'Property',
          startDate: '2026-12-31',
          endDate: '2026-01-01',
          currency: 'USD',
          sumInsured: '10000.00',
          covers: [{ riskCoverId: riskCoverId1, coverageLimit: '10000.00' }],
        });
      expect(badDateRes.status).toBe(400);
    });

    // Step 4: Create Claim against policy cover
    it('Step 4: Create claim under review, verify status and facts', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/claims')
        .send({
          policyId,
          policyRiskCoverId: policyCoverId1,
          lossDate: '2026-03-10',
          dateNotified: '2026-03-12',
          lossNature: 'Trailer overturned on highway.',
          estimatedLossAmount: '35000.00',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.claimReference).toMatch(/^CLM-2026-\d{6}$/);
      expect(res.body.data.status).toBe('UNDER_REVIEW');
      expect(res.body.data.currency).toBe('USD');
      expect(res.body.data.estimatedLossAmount).toBe('35000.00');
      expect(res.body.data.approvedPayoutAmount).toBeNull();
      expect(res.body.data.version).toBe(1);

      claimId = res.body.data.id;

      // Loss date outside policy period rejection
      const outOfBoundsRes = await request(app.getHttpServer())
        .post('/api/v1/claims')
        .send({
          policyId,
          policyRiskCoverId: policyCoverId1,
          lossDate: '2025-12-25', // before policy start date
          dateNotified: '2026-03-12',
          lossNature: 'Prior incident',
          estimatedLossAmount: '5000.00',
        });
      expect(outOfBoundsRes.status).toBe(400);
    });

    // Step 5: Edit claim facts while UNDER_REVIEW
    it('Step 5: Edit claim facts while under review', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/claims/${claimId}`)
        .send({
          expectedVersion: 1,
          estimatedLossAmount: '38000.00',
          lossNature: 'Trailer overturned on highway with cargo spillage.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.estimatedLossAmount).toBe('38000.00');
    });

    // Step 6: Review Claim (APPROVED) and verify post-review lock
    it('Step 6: Record review decision and lock eligibility facts', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/claims/${claimId}/review`)
        .send({
          expectedVersion: 2,
          decision: 'APPROVED',
          reason: 'Police report and on-site adjuster report verified.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.review.decision).toBe('APPROVED');
      expect(res.body.data.status).toBe('RESERVED_NOT_SETTLED');

      // Attempting second review is rejected (409)
      const secondReviewRes = await request(app.getHttpServer())
        .post(`/api/v1/claims/${claimId}/review`)
        .send({
          expectedVersion: 3,
          decision: 'DENIED',
          reason: 'Duplicate review attempt',
        });
      expect(secondReviewRes.status).toBe(409);

      // Attempting to edit facts after review is rejected (422)
      const postReviewEditRes = await request(app.getHttpServer())
        .patch(`/api/v1/claims/${claimId}`)
        .send({
          expectedVersion: 3,
          estimatedLossAmount: '50000.00',
        });
      expect(postReviewEditRes.status).toBe(422);
    });

    // Step 7: Set Approved Payout
    it('Step 7: Set approved payout amount and check version increment', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/claims/${claimId}/approved-payout`)
        .send({
          approvedPayoutAmount: '30000.00',
          expectedVersion: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.approvedPayoutAmount).toBe('30000.00');
      expect(res.body.data.outstandingBalance).toBe('30000.00');
      expect(res.body.data.status).toBe('PAYMENT_OUTSTANDING');
      expect(res.body.data.version).toBe(4);

      // Version conflict rejection
      const staleRes = await request(app.getHttpServer())
        .put(`/api/v1/claims/${claimId}/approved-payout`)
        .send({
          approvedPayoutAmount: '25000.00',
          expectedVersion: 3, // Stale! Current is 4
        });
      expect(staleRes.status).toBe(409);
      expect(staleRes.body.data.code).toBe('CLAIM_VERSION_CONFLICT');
    });

    // Step 8: Same-currency and Cross-currency Payments using locked rates
    it('Step 8: Record payments with locked conversion and check balances', async () => {
      // 1. Same-currency payment: 10,000.00 USD (version goes from 4 -> 5)
      const pay1Res = await request(app.getHttpServer())
        .post(`/api/v1/claims/${claimId}/payments`)
        .send({
          paymentDate: '2026-03-25',
          amount: '10000.00',
          currency: 'USD',
          reference: 'PAY-USD-001',
          expectedVersion: 4,
        });

      expect(pay1Res.status).toBe(201);
      expect(pay1Res.body.data.appliedRate).toBe('1.0000');
      expect(pay1Res.body.data.amountInClaimCurrency).toBe('10000.00');

      // Check claim state: payout 30000, paid 10000, balance 20000, version 5
      const claimAfterPay1 = await request(app.getHttpServer()).get(`/api/v1/claims/${claimId}`);
      expect(claimAfterPay1.body.data.totalPaid).toBe('10000.00');
      expect(claimAfterPay1.body.data.outstandingBalance).toBe('20000.00');
      expect(claimAfterPay1.body.data.version).toBe(5);

      // 2. Cross-currency payment: in GHS.
      // Locked rate sheet 1: GHS -> USD rate is 0.0800.
      // Payment of 125,000.00 GHS * 0.08 = 10,000.00 USD!
      const pay2Res = await request(app.getHttpServer())
        .post(`/api/v1/claims/${claimId}/payments`)
        .send({
          paymentDate: '2026-04-01',
          amount: '125000.00',
          currency: 'GHS',
          reference: 'PAY-GHS-CROSS-002',
          expectedVersion: 5,
        });

      expect(pay2Res.status).toBe(201);
      expect(pay2Res.body.data.appliedRate).toBe('0.0800');
      expect(pay2Res.body.data.amountInClaimCurrency).toBe('10000.00');

      // Check claim state: payout 30000, paid 20000, balance 10000, version 6
      const claimAfterPay2 = await request(app.getHttpServer()).get(`/api/v1/claims/${claimId}`);
      expect(claimAfterPay2.body.data.totalPaid).toBe('20000.00');
      expect(claimAfterPay2.body.data.outstandingBalance).toBe('10000.00');
      expect(claimAfterPay2.body.data.status).toBe('PAYMENT_OUTSTANDING');
      expect(claimAfterPay2.body.data.version).toBe(6);
    });

    // Step 9: Exercise Overpayment Confirmation Protocol
    it('Step 9: Overpayment confirmation protocol on excess payment and payout reduction', async () => {
      // Payment of 15,000 USD would exceed remaining balance of 10,000 USD (resulting in balance -5,000.00)
      const overpayAttempt = await request(app.getHttpServer())
        .post(`/api/v1/claims/${claimId}/payments`)
        .send({
          paymentDate: '2026-04-10',
          amount: '15000.00',
          currency: 'USD',
          expectedVersion: 6,
          confirmOverpayment: false,
        });

      expect(overpayAttempt.status).toBe(409);
      expect(overpayAttempt.body.data.code).toBe('OVERPAYMENT_CONFIRMATION_REQUIRED');
      expect(overpayAttempt.body.data.details.proposedSignedBalance).toBe('-5000.00');
      expect(overpayAttempt.body.data.details.absoluteOverpayment).toBe('5000.00');

      // Settle with confirmOverpayment: true (version becomes 7)
      const confirmedOverpay = await request(app.getHttpServer())
        .post(`/api/v1/claims/${claimId}/payments`)
        .send({
          paymentDate: '2026-04-10',
          amount: '15000.00',
          currency: 'USD',
          expectedVersion: 6,
          confirmOverpayment: true,
        });

      expect(confirmedOverpay.status).toBe(201);

      // Verify claim status is PAID and overpaidAmount is 5000.00
      const claimFinal = await request(app.getHttpServer()).get(`/api/v1/claims/${claimId}`);
      expect(claimFinal.body.data.status).toBe('PAID');
      expect(claimFinal.body.data.totalPaid).toBe('35000.00');
      expect(claimFinal.body.data.outstandingBalance).toBe('-5000.00');
      expect(claimFinal.body.data.overpaidAmount).toBe('5000.00');
    });

    // Step 10: Create newer rate sheet and verify historical policy/payment rates are unaffected
    it('Step 10: Create newer rate sheet and prove historical policy locks remain intact', async () => {
      // Create newer sheet effective 2026-09-01
      const newSheetRes = await request(app.getHttpServer())
        .post('/api/v1/exchange-rate-sheets')
        .send({
          effectiveAt: '2026-09-01T00:00:00.000Z',
          notes: 'Newer Q3 Rates with different conversion ratios',
          usdToGhsRate: '20.0000',
          eurToGhsRate: '22.2222',
        });
      expect(newSheetRes.status).toBe(201);

      // Current active sheet is now the newer one
      const curRes = await request(app.getHttpServer()).get('/api/v1/exchange-rate-sheets/current');
      expect(curRes.body.data.id).toBe(newSheetRes.body.data.id);

      // Verify policy 1 is still locked to sheet 1
      const policyRes = await request(app.getHttpServer()).get(`/api/v1/policies/${policyId}`);
      expect(policyRes.body.data.exchangeRateSheetId).toBe(rateSheet1Id);

      // Verify claim payments history maintains the stored conversion rates and totals
      const paymentsRes = await request(app.getHttpServer()).get(`/api/v1/claims/${claimId}/payments`);
      expect(paymentsRes.body.data.items.length).toBe(3);
      expect(paymentsRes.body.data.items[1].appliedRate).toBe('0.0800');
      expect(paymentsRes.body.data.items[1].amountInClaimCurrency).toBe('10000.00');
    });

    // Step 11: List filtering and full dataset grouped totals
    it('Step 11: Verify claims list returns totalsByCurrency across the full filtered set', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/claims?currency=USD');
      expect(res.status).toBe(200);
      expect(res.body.data.totalsByCurrency).toBeDefined();
      expect(res.body.data.totalsByCurrency.length).toBe(1);
      expect(res.body.data.totalsByCurrency[0].currency).toBe('USD');
      expect(res.body.data.totalsByCurrency[0].totalPaid).toBe('35000.00');
    });
  });
});
