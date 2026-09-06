import { PrismaClient, Currency, RiskCoverStatus, PolicyStatus, ReviewDecision } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting idempotent database seed...');

  // 1. Seed Risk Covers (6 definitions)
  const riskCovers = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      code: 'ACC_DAMAGE',
      name: 'Accidental Damage',
      description: 'Covers sudden and accidental physical loss or damage to insured property.',
      status: RiskCoverStatus.ACTIVE,
      createdBy: 'seed_system',
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      code: 'THEFT',
      name: 'Theft & Burglary',
      description: 'Covers loss resulting from theft, burglary, and forcible entry.',
      status: RiskCoverStatus.ACTIVE,
      createdBy: 'seed_system',
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      code: 'FIRE',
      name: 'Fire & Lightning',
      description: 'Covers damage caused by fire, explosion, lightning, and resulting smoke.',
      status: RiskCoverStatus.ACTIVE,
      createdBy: 'seed_system',
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      code: 'FLOOD',
      name: 'Flood & Inundation',
      description: 'Covers water damage caused by overflowing rivers, storm surges, or burst pipes.',
      status: RiskCoverStatus.ACTIVE,
      createdBy: 'seed_system',
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      code: 'TP_LIABILITY',
      name: 'Third-Party Liability',
      description: 'Covers legal liability for third-party bodily injury or property damage.',
      status: RiskCoverStatus.ACTIVE,
      createdBy: 'seed_system',
    },
    {
      id: '10000000-0000-0000-0000-000000000006',
      code: 'GIT',
      name: 'Goods in Transit',
      description: 'Covers loss or damage to merchandise while in transit by road, rail, or air.',
      status: RiskCoverStatus.ACTIVE,
      createdBy: 'seed_system',
    },
  ];

  for (const rc of riskCovers) {
    await prisma.riskCover.upsert({
      where: { id: rc.id },
      update: { name: rc.name, description: rc.description, status: rc.status },
      create: rc,
    });
  }
  console.log(`Seeded ${riskCovers.length} risk covers.`);

  // 2. Seed Exchange Rate Sheets (2 historical + 1 current)
  // Sheet 1: 2026-01-01 (Historical 1)
  const sheet1Id = '20000000-0000-0000-0000-000000000001';
  const sheet1Exists = await prisma.exchangeRateSheet.findUnique({ where: { id: sheet1Id } });
  if (!sheet1Exists) {
    await prisma.exchangeRateSheet.create({
      data: {
        id: sheet1Id,
        reference: 'FX-20260101-000001',
        effectiveAt: new Date('2026-01-01T00:00:00.000Z'),
        notes: 'Illustrative Rates Q1 2026',
        createdBy: 'seed_system',
        entries: {
          create: [
            { id: '21000000-0000-0000-0000-000000000001', fromCurrency: Currency.GHS, toCurrency: Currency.USD, rate: '0.0800' },
            { id: '21000000-0000-0000-0000-000000000002', fromCurrency: Currency.GHS, toCurrency: Currency.EUR, rate: '0.0750' },
            { id: '21000000-0000-0000-0000-000000000003', fromCurrency: Currency.USD, toCurrency: Currency.GHS, rate: '12.5000' },
            { id: '21000000-0000-0000-0000-000000000004', fromCurrency: Currency.USD, toCurrency: Currency.EUR, rate: '0.9375' },
            { id: '21000000-0000-0000-0000-000000000005', fromCurrency: Currency.EUR, toCurrency: Currency.GHS, rate: '13.3333' },
            { id: '21000000-0000-0000-0000-000000000006', fromCurrency: Currency.EUR, toCurrency: Currency.USD, rate: '1.0667' },
          ],
        },
      },
    });
  }

  // Sheet 2: 2026-06-01 (Historical 2)
  const sheet2Id = '20000000-0000-0000-0000-000000000002';
  const sheet2Exists = await prisma.exchangeRateSheet.findUnique({ where: { id: sheet2Id } });
  if (!sheet2Exists) {
    await prisma.exchangeRateSheet.create({
      data: {
        id: sheet2Id,
        reference: 'FX-20260601-000002',
        effectiveAt: new Date('2026-06-01T00:00:00.000Z'),
        notes: 'Illustrative Rates Mid-Year 2026',
        createdBy: 'seed_system',
        entries: {
          create: [
            { id: '22000000-0000-0000-0000-000000000001', fromCurrency: Currency.GHS, toCurrency: Currency.USD, rate: '0.0714' },
            { id: '22000000-0000-0000-0000-000000000002', fromCurrency: Currency.GHS, toCurrency: Currency.EUR, rate: '0.0667' },
            { id: '22000000-0000-0000-0000-000000000003', fromCurrency: Currency.USD, toCurrency: Currency.GHS, rate: '14.0000' },
            { id: '22000000-0000-0000-0000-000000000004', fromCurrency: Currency.USD, toCurrency: Currency.EUR, rate: '0.9333' },
            { id: '22000000-0000-0000-0000-000000000005', fromCurrency: Currency.EUR, toCurrency: Currency.GHS, rate: '15.0000' },
            { id: '22000000-0000-0000-0000-000000000006', fromCurrency: Currency.EUR, toCurrency: Currency.USD, rate: '1.0714' },
          ],
        },
      },
    });
  }

  // Sheet 3: 2026-09-01 (Current active sheet)
  const sheet3Id = '20000000-0000-0000-0000-000000000003';
  const sheet3Exists = await prisma.exchangeRateSheet.findUnique({ where: { id: sheet3Id } });
  if (!sheet3Exists) {
    await prisma.exchangeRateSheet.create({
      data: {
        id: sheet3Id,
        reference: 'FX-20260901-000003',
        effectiveAt: new Date('2026-09-01T00:00:00.000Z'),
        notes: 'Illustrative Rates Current Published Q3 2026',
        createdBy: 'seed_system',
        entries: {
          create: [
            { id: '23000000-0000-0000-0000-000000000001', fromCurrency: Currency.GHS, toCurrency: Currency.USD, rate: '0.0667' },
            { id: '23000000-0000-0000-0000-000000000002', fromCurrency: Currency.GHS, toCurrency: Currency.EUR, rate: '0.0625' },
            { id: '23000000-0000-0000-0000-000000000003', fromCurrency: Currency.USD, toCurrency: Currency.GHS, rate: '15.0000' },
            { id: '23000000-0000-0000-0000-000000000004', fromCurrency: Currency.USD, toCurrency: Currency.EUR, rate: '0.9375' },
            { id: '23000000-0000-0000-0000-000000000005', fromCurrency: Currency.EUR, toCurrency: Currency.GHS, rate: '16.0000' },
            { id: '23000000-0000-0000-0000-000000000006', fromCurrency: Currency.EUR, toCurrency: Currency.USD, rate: '1.0667' },
          ],
        },
      },
    });
  }
  console.log('Seeded 3 exchange rate sheets.');

  // 3. Seed 10 Policies across GHS, USD, and EUR
  const policiesData = [
    {
      id: '30000000-0000-0000-0000-000000000001',
      policyNumber: 'POL-2026-000001',
      insuredName: 'Ashanti Gold Mining Corp',
      policyType: 'Commercial Property & Asset',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      currency: Currency.USD,
      premiumAmount: '45000.00',
      sumInsured: '5000000.00',
      exchangeRateSheetId: sheet1Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000001', riskCoverId: riskCovers[0].id, limit: '2000000.00', deductible: '25000.00', terms: 'Heavy machinery coverage' },
        { id: '31000000-0000-0000-0000-000000000002', riskCoverId: riskCovers[2].id, limit: '3000000.00', deductible: '10000.00', terms: 'Refinery and processing plant' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      policyNumber: 'POL-2026-000002',
      insuredName: 'Accra Logistics & Transport Ltd',
      policyType: 'Fleet & Cargo',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2027-01-14'),
      currency: Currency.GHS,
      premiumAmount: '120000.00',
      sumInsured: '1500000.00',
      exchangeRateSheetId: sheet1Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000003', riskCoverId: riskCovers[5].id, limit: '1000000.00', deductible: '15000.00', terms: 'Interstate cargo transit' },
        { id: '31000000-0000-0000-0000-000000000004', riskCoverId: riskCovers[0].id, limit: '500000.00', deductible: '10000.00', terms: 'Fleet vehicle accidental damage' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000003',
      policyNumber: 'POL-2026-000003',
      insuredName: 'Euro-African Trade Hub SARL',
      policyType: 'Maritime & Port Storage',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2027-01-31'),
      currency: Currency.EUR,
      premiumAmount: '35000.00',
      sumInsured: '2500000.00',
      exchangeRateSheetId: sheet1Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000005', riskCoverId: riskCovers[3].id, limit: '1500000.00', deductible: '20000.00', terms: 'Tema harbour warehouse flood' },
        { id: '31000000-0000-0000-0000-000000000006', riskCoverId: riskCovers[1].id, limit: '1000000.00', deductible: '15000.00', terms: 'Container yard burglary' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000004',
      policyNumber: 'POL-2026-000004',
      insuredName: 'Volta River Hydro Constructors',
      policyType: 'Civil Engineering & Infrastructure',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-05-31'),
      currency: Currency.USD,
      premiumAmount: '85000.00',
      sumInsured: '10000000.00',
      exchangeRateSheetId: sheet2Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000007', riskCoverId: riskCovers[4].id, limit: '5000000.00', deductible: '50000.00', terms: 'Public liability at dam site' },
        { id: '31000000-0000-0000-0000-000000000008', riskCoverId: riskCovers[3].id, limit: '5000000.00', deductible: '50000.00', terms: 'Flooding and natural disaster' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000005',
      policyNumber: 'POL-2026-000005',
      insuredName: 'Kumasi Cocoa Processing Factory',
      policyType: 'Industrial Property',
      startDate: new Date('2026-06-15'),
      endDate: new Date('2027-06-14'),
      currency: Currency.GHS,
      premiumAmount: '95000.00',
      sumInsured: '8000000.00',
      exchangeRateSheetId: sheet2Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000009', riskCoverId: riskCovers[2].id, limit: '5000000.00', deductible: '50000.00', terms: 'Processing plant fire & explosion' },
        { id: '31000000-0000-0000-0000-000000000010', riskCoverId: riskCovers[1].id, limit: '3000000.00', deductible: '30000.00', terms: 'Warehouse stock theft' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000006',
      policyNumber: 'POL-2026-000006',
      insuredName: 'Sahel Solar Energy Consortium',
      policyType: 'Renewable Power Facilities',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2027-06-30'),
      currency: Currency.EUR,
      premiumAmount: '50000.00',
      sumInsured: '6000000.00',
      exchangeRateSheetId: sheet2Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000011', riskCoverId: riskCovers[0].id, limit: '4000000.00', deductible: '40000.00', terms: 'Inverter and panel damage' },
        { id: '31000000-0000-0000-0000-000000000012', riskCoverId: riskCovers[4].id, limit: '2000000.00', deductible: '25000.00', terms: 'Grid operator liability' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000007',
      policyNumber: 'POL-2026-000007',
      insuredName: 'Atlantic Seafood Exporters',
      policyType: 'Cold Chain & Marine',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-08-31'),
      currency: Currency.USD,
      premiumAmount: '28000.00',
      sumInsured: '1200000.00',
      exchangeRateSheetId: sheet3Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000013', riskCoverId: riskCovers[5].id, limit: '800000.00', deductible: '10000.00', terms: 'Cold storage breakdown in transit' },
        { id: '31000000-0000-0000-0000-000000000014', riskCoverId: riskCovers[0].id, limit: '400000.00', deductible: '5000.00', terms: 'Processing freezer unit damage' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000008',
      policyNumber: 'POL-2026-000008',
      insuredName: 'Osu Mall Retail Enterprises',
      policyType: 'Commercial Property',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-08-31'),
      currency: Currency.GHS,
      premiumAmount: '75000.00',
      sumInsured: '4000000.00',
      exchangeRateSheetId: sheet3Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000015', riskCoverId: riskCovers[1].id, limit: '2000000.00', deductible: '20000.00', terms: 'Retail store inventory burglary' },
        { id: '31000000-0000-0000-0000-000000000016', riskCoverId: riskCovers[2].id, limit: '2000000.00', deductible: '20000.00', terms: 'Building fire and smoke' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000009',
      policyNumber: 'POL-2026-000009',
      insuredName: 'Geneva Pharma West Africa',
      policyType: 'Specialty Healthcare Liability',
      startDate: new Date('2026-09-02'),
      endDate: new Date('2027-09-01'),
      currency: Currency.EUR,
      premiumAmount: '60000.00',
      sumInsured: '5000000.00',
      exchangeRateSheetId: sheet3Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000017', riskCoverId: riskCovers[4].id, limit: '3000000.00', deductible: '30000.00', terms: 'Clinical distribution liability' },
        { id: '31000000-0000-0000-0000-000000000018', riskCoverId: riskCovers[5].id, limit: '2000000.00', deductible: '20000.00', terms: 'Vaccine transport thermal breach' },
      ],
    },
    {
      id: '30000000-0000-0000-0000-000000000010',
      policyNumber: 'POL-2026-000010',
      insuredName: 'Golden Coast Hospitality Resorts',
      policyType: 'Resort & Hotel All-Risk',
      startDate: new Date('2026-09-03'),
      endDate: new Date('2027-09-02'),
      currency: Currency.USD,
      premiumAmount: '40000.00',
      sumInsured: '3500000.00',
      exchangeRateSheetId: sheet3Id,
      status: PolicyStatus.ACTIVE,
      createdBy: 'seed_system',
      covers: [
        { id: '31000000-0000-0000-0000-000000000019', riskCoverId: riskCovers[3].id, limit: '2000000.00', deductible: '25000.00', terms: 'Beachfront flooding and storm' },
        { id: '31000000-0000-0000-0000-000000000020', riskCoverId: riskCovers[0].id, limit: '1500000.00', deductible: '15000.00', terms: 'Resort facility accidental damage' },
      ],
    },
  ];

  for (const pol of policiesData) {
    const existing = await prisma.policy.findUnique({ where: { id: pol.id } });
    if (!existing) {
      await prisma.policy.create({
        data: {
          id: pol.id,
          policyNumber: pol.policyNumber,
          insuredName: pol.insuredName,
          policyType: pol.policyType,
          startDate: pol.startDate,
          endDate: pol.endDate,
          currency: pol.currency,
          premiumAmount: pol.premiumAmount,
          sumInsured: pol.sumInsured,
          exchangeRateSheetId: pol.exchangeRateSheetId,
          status: pol.status,
          createdBy: pol.createdBy,
          policyRiskCovers: {
            create: pol.covers.map((c) => {
              const rc = riskCovers.find((r) => r.id === c.riskCoverId)!;
              return {
                id: c.id,
                riskCoverId: c.riskCoverId,
                coverCodeSnapshot: rc.code,
                coverNameSnapshot: rc.name,
                coverageLimit: c.limit,
                deductibleAmount: c.deductible,
                terms: c.terms,
                createdBy: 'seed_system',
              };
            }),
          },
        },
      });
    }
  }
  console.log(`Seeded ${policiesData.length} policies with assigned covers.`);

  // 4. Seed 18 Claims covering all required lifecycle conditions:
  // State 1: UNDER_REVIEW (no review) - Claims 1, 2, 3
  // State 2: DENIED (review decision = DENIED) - Claims 4, 5
  // State 3: RESERVED_NOT_SETTLED (review approved, payout is null) - Claims 6, 7
  // State 4: PAYMENT_OUTSTANDING (review approved, payout set, balance > 0) - Claims 8, 9, 10, 11
  // State 5: PAID (review approved, payout set, balance == 0) - Claims 12, 13, 14, 15
  // State 6: OVERPAID (review approved, payout set, balance < 0) - Claims 16, 17
  // State 7: ZERO_PAYOUT (review approved, payout == 0.00, balance == 0) - Claim 18

  const claimsData = [
    // 1. UNDER_REVIEW (USD)
    {
      id: '40000000-0000-0000-0000-000000000001',
      claimReference: 'CLM-2026-000001',
      policyId: policiesData[0].id,
      policyRiskCoverId: policiesData[0].covers[0].id,
      currency: Currency.USD,
      lossDate: new Date('2026-02-10'),
      dateNotified: new Date('2026-02-12'),
      lossNature: 'Excavator engine overheated and cracked piston block.',
      estimatedLossAmount: '45000.00',
      approvedPayoutAmount: null,
      version: 1,
      review: null,
    },
    // 2. UNDER_REVIEW (GHS)
    {
      id: '40000000-0000-0000-0000-000000000002',
      claimReference: 'CLM-2026-000002',
      policyId: policiesData[1].id,
      policyRiskCoverId: policiesData[1].covers[0].id,
      currency: Currency.GHS,
      lossDate: new Date('2026-03-01'),
      dateNotified: new Date('2026-03-02'),
      lossNature: 'Cargo pallet dropped during unloading at Kumasi depot.',
      estimatedLossAmount: '80000.00',
      approvedPayoutAmount: null,
      version: 1,
      review: null,
    },
    // 3. UNDER_REVIEW (EUR)
    {
      id: '40000000-0000-0000-0000-000000000003',
      claimReference: 'CLM-2026-000003',
      policyId: policiesData[2].id,
      policyRiskCoverId: policiesData[2].covers[0].id,
      currency: Currency.EUR,
      lossDate: new Date('2026-04-10'),
      dateNotified: new Date('2026-04-15'),
      lossNature: 'Minor seawater leak damaged exterior packaging of timber crates.',
      estimatedLossAmount: '12000.00',
      approvedPayoutAmount: null,
      version: 1,
      review: null,
    },
    // 4. DENIED (USD)
    {
      id: '40000000-0000-0000-0000-000000000004',
      claimReference: 'CLM-2026-000004',
      policyId: policiesData[0].id,
      policyRiskCoverId: policiesData[0].covers[1].id,
      currency: Currency.USD,
      lossDate: new Date('2026-02-20'),
      dateNotified: new Date('2026-02-25'),
      lossNature: 'Electrical short-circuit without combustion.',
      estimatedLossAmount: '30000.00',
      approvedPayoutAmount: null,
      version: 1,
      review: {
        id: '41000000-0000-0000-0000-000000000004',
        decision: ReviewDecision.DENIED,
        reason: 'Policy fire endorsement excludes non-combustive electrical arching per section 4b.',
      },
    },
    // 5. DENIED (GHS)
    {
      id: '40000000-0000-0000-0000-000000000005',
      claimReference: 'CLM-2026-000005',
      policyId: policiesData[1].id,
      policyRiskCoverId: policiesData[1].covers[1].id,
      currency: Currency.GHS,
      lossDate: new Date('2026-03-10'),
      dateNotified: new Date('2026-03-20'),
      lossNature: 'Vehicle scratch due to normal wear and tear.',
      estimatedLossAmount: '15000.00',
      approvedPayoutAmount: null,
      version: 1,
      review: {
        id: '41000000-0000-0000-0000-000000000005',
        decision: ReviewDecision.DENIED,
        reason: 'Cosmetic wear and tear is expressly excluded from accidental damage cover.',
      },
    },
    // 6. RESERVED_NOT_SETTLED (USD)
    {
      id: '40000000-0000-0000-0000-000000000006',
      claimReference: 'CLM-2026-000006',
      policyId: policiesData[3].id,
      policyRiskCoverId: policiesData[3].covers[0].id,
      currency: Currency.USD,
      lossDate: new Date('2026-06-20'),
      dateNotified: new Date('2026-06-22'),
      lossNature: 'Third-party scaffolding collapsed onto adjacent road.',
      estimatedLossAmount: '150000.00',
      approvedPayoutAmount: null,
      version: 1,
      review: {
        id: '41000000-0000-0000-0000-000000000006',
        decision: ReviewDecision.APPROVED,
        reason: 'Accident report and third-party liability established by engineering adjuster.',
      },
    },
    // 7. RESERVED_NOT_SETTLED (EUR)
    {
      id: '40000000-0000-0000-0000-000000000007',
      claimReference: 'CLM-2026-000007',
      policyId: policiesData[5].id,
      policyRiskCoverId: policiesData[5].covers[0].id,
      currency: Currency.EUR,
      lossDate: new Date('2026-07-15'),
      dateNotified: new Date('2026-07-16'),
      lossNature: 'Lightning strike damaged power grid inverter array.',
      estimatedLossAmount: '75000.00',
      approvedPayoutAmount: null,
      version: 1,
      review: {
        id: '41000000-0000-0000-0000-000000000007',
        decision: ReviewDecision.APPROVED,
        reason: 'Technical inspection confirms inverter surge damage from direct lightning strike.',
      },
    },
    // 8. PAYMENT_OUTSTANDING (USD) - partial same-currency payment
    {
      id: '40000000-0000-0000-0000-000000000008',
      claimReference: 'CLM-2026-000008',
      policyId: policiesData[0].id,
      policyRiskCoverId: policiesData[0].covers[0].id,
      currency: Currency.USD,
      lossDate: new Date('2026-03-01'),
      dateNotified: new Date('2026-03-05'),
      lossNature: 'Drill rig collision with support pylon.',
      estimatedLossAmount: '80000.00',
      approvedPayoutAmount: '70000.00',
      version: 2,
      review: {
        id: '41000000-0000-0000-0000-000000000008',
        decision: ReviewDecision.APPROVED,
        reason: 'Valid on-site accidental collision.',
      },
      payments: [
        {
          id: '50000000-0000-0000-0000-000000000001',
          paymentDate: new Date('2026-03-20'),
          amount: '30000.00',
          currency: Currency.USD,
          exchangeRateSheetId: sheet1Id,
          exchangeRateEntryId: null,
          appliedRate: '1.0000',
          amountInClaimCurrency: '30000.00',
          reference: 'PARTIAL-USD-001',
        },
      ],
    },
    // 9. PAYMENT_OUTSTANDING (GHS) - partial cross-currency payment in USD (uses Sheet 1: USD->GHS rate 12.50)
    {
      id: '40000000-0000-0000-0000-000000000009',
      claimReference: 'CLM-2026-000009',
      policyId: policiesData[1].id,
      policyRiskCoverId: policiesData[1].covers[0].id,
      currency: Currency.GHS,
      lossDate: new Date('2026-03-15'),
      dateNotified: new Date('2026-03-18'),
      lossNature: 'Truck container overturning during rainstorm.',
      estimatedLossAmount: '250000.00',
      approvedPayoutAmount: '200000.00',
      version: 2,
      review: {
        id: '41000000-0000-0000-0000-000000000009',
        decision: ReviewDecision.APPROVED,
        reason: 'Accident investigator approved cargo loss.',
      },
      payments: [
        // 8000 USD * 12.50 = 100,000.00 GHS
        {
          id: '50000000-0000-0000-0000-000000000002',
          paymentDate: new Date('2026-04-01'),
          amount: '8000.00',
          currency: Currency.USD,
          exchangeRateSheetId: sheet1Id,
          exchangeRateEntryId: '21000000-0000-0000-0000-000000000003',
          appliedRate: '12.5000',
          amountInClaimCurrency: '100000.00',
          reference: 'CROSS-PAY-USD2GHS-01',
        },
      ],
    },
    // 10. PAYMENT_OUTSTANDING (EUR) - no payments yet
    {
      id: '40000000-0000-0000-0000-000000000010',
      claimReference: 'CLM-2026-000010',
      policyId: policiesData[2].id,
      policyRiskCoverId: policiesData[2].covers[1].id,
      currency: Currency.EUR,
      lossDate: new Date('2026-05-01'),
      dateNotified: new Date('2026-05-03'),
      lossNature: 'Warehouse burglary with stolen industrial electronics.',
      estimatedLossAmount: '50000.00',
      approvedPayoutAmount: '45000.00',
      version: 1,
      review: {
        id: '41000000-0000-0000-0000-000000000010',
        decision: ReviewDecision.APPROVED,
        reason: 'Police theft report verified.',
      },
      payments: [],
    },
    // 11. PAYMENT_OUTSTANDING (GHS) - partial cross-currency in EUR (Sheet 2: EUR->GHS rate 15.00)
    {
      id: '40000000-0000-0000-0000-000000000011',
      claimReference: 'CLM-2026-000011',
      policyId: policiesData[4].id,
      policyRiskCoverId: policiesData[4].covers[0].id,
      currency: Currency.GHS,
      lossDate: new Date('2026-07-01'),
      dateNotified: new Date('2026-07-04'),
      lossNature: 'Factory storage silo fire.',
      estimatedLossAmount: '500000.00',
      approvedPayoutAmount: '450000.00',
      version: 2,
      review: {
        id: '41000000-0000-0000-0000-000000000011',
        decision: ReviewDecision.APPROVED,
        reason: 'Fire department incident assessment verified.',
      },
      payments: [
        // 10000 EUR * 15.00 = 150,000.00 GHS
        {
          id: '50000000-0000-0000-0000-000000000003',
          paymentDate: new Date('2026-07-20'),
          amount: '10000.00',
          currency: Currency.EUR,
          exchangeRateSheetId: sheet2Id,
          exchangeRateEntryId: '22000000-0000-0000-0000-000000000005',
          appliedRate: '15.0000',
          amountInClaimCurrency: '150000.00',
          reference: 'CROSS-PAY-EUR2GHS-02',
        },
      ],
    },
    // 12. PAID (USD) - full same-currency payout
    {
      id: '40000000-0000-0000-0000-000000000012',
      claimReference: 'CLM-2026-000012',
      policyId: policiesData[3].id,
      policyRiskCoverId: policiesData[3].covers[1].id,
      currency: Currency.USD,
      lossDate: new Date('2026-06-25'),
      dateNotified: new Date('2026-06-28'),
      lossNature: 'Flash flood submerged construction substation.',
      estimatedLossAmount: '100000.00',
      approvedPayoutAmount: '90000.00',
      version: 2,
      review: {
        id: '41000000-0000-0000-0000-000000000012',
        decision: ReviewDecision.APPROVED,
        reason: 'Flood damage claim confirmed.',
      },
      payments: [
        {
          id: '50000000-0000-0000-0000-000000000004',
          paymentDate: new Date('2026-07-10'),
          amount: '90000.00',
          currency: Currency.USD,
          exchangeRateSheetId: sheet2Id,
          exchangeRateEntryId: null,
          appliedRate: '1.0000',
          amountInClaimCurrency: '90000.00',
          reference: 'FULL-SETTLE-USD-12',
        },
      ],
    },
    // 13. PAID (GHS) - full payout with 2 installments
    {
      id: '40000000-0000-0000-0000-000000000013',
      claimReference: 'CLM-2026-000013',
      policyId: policiesData[1].id,
      policyRiskCoverId: policiesData[1].covers[1].id,
      currency: Currency.GHS,
      lossDate: new Date('2026-02-15'),
      dateNotified: new Date('2026-02-18'),
      lossNature: 'Delivery van rear-end collision.',
      estimatedLossAmount: '60000.00',
      approvedPayoutAmount: '50000.00',
      version: 3,
      review: {
        id: '41000000-0000-0000-0000-000000000013',
        decision: ReviewDecision.APPROVED,
        reason: 'Garage repair quotation verified.',
      },
      payments: [
        {
          id: '50000000-0000-0000-0000-000000000005',
          paymentDate: new Date('2026-03-01'),
          amount: '20000.00',
          currency: Currency.GHS,
          exchangeRateSheetId: sheet1Id,
          exchangeRateEntryId: null,
          appliedRate: '1.0000',
          amountInClaimCurrency: '20000.00',
          reference: 'INSTAL-GHS-01',
        },
        {
          id: '50000000-0000-0000-0000-000000000006',
          paymentDate: new Date('2026-03-15'),
          amount: '30000.00',
          currency: Currency.GHS,
          exchangeRateSheetId: sheet1Id,
          exchangeRateEntryId: null,
          appliedRate: '1.0000',
          amountInClaimCurrency: '30000.00',
          reference: 'INSTAL-GHS-02',
        },
      ],
    },
    // 14. PAID (EUR) - cross-currency payment in USD (uses Sheet 1: USD->EUR rate 0.93750000)
    // 32000.00 USD * 0.9375 = 30,000.00 EUR
    {
      id: '40000000-0000-0000-0000-000000000014',
      claimReference: 'CLM-2026-000014',
      policyId: policiesData[2].id,
      policyRiskCoverId: policiesData[2].covers[0].id,
      currency: Currency.EUR,
      lossDate: new Date('2026-04-20'),
      dateNotified: new Date('2026-04-22'),
      lossNature: 'Container stormwater damage.',
      estimatedLossAmount: '35000.00',
      approvedPayoutAmount: '30000.00',
      version: 2,
      review: {
        id: '41000000-0000-0000-0000-000000000014',
        decision: ReviewDecision.APPROVED,
        reason: 'Marine cargo inspection confirmed moisture damage.',
      },
      payments: [
        {
          id: '50000000-0000-0000-0000-000000000007',
          paymentDate: new Date('2026-05-10'),
          amount: '32000.00',
          currency: Currency.USD,
          exchangeRateSheetId: sheet1Id,
          exchangeRateEntryId: '21000000-0000-0000-0000-000000000004',
          appliedRate: '0.9375',
          amountInClaimCurrency: '30000.00',
          reference: 'CROSS-PAY-USD2EUR-03',
        },
      ],
    },
    // 15. PAID (USD) - full payment using current Sheet 3
    {
      id: '40000000-0000-0000-0000-000000000015',
      claimReference: 'CLM-2026-000015',
      policyId: policiesData[6].id,
      policyRiskCoverId: policiesData[6].covers[0].id,
      currency: Currency.USD,
      lossDate: new Date('2026-09-02'),
      dateNotified: new Date('2026-09-03'),
      lossNature: 'Refrigerated container failure spoiled fresh catch shipment.',
      estimatedLossAmount: '25000.00',
      approvedPayoutAmount: '22000.00',
      version: 2,
      review: {
        id: '41000000-0000-0000-0000-000000000015',
        decision: ReviewDecision.APPROVED,
        reason: 'Temperature log data proved compressor unit breakdown.',
      },
      payments: [
        {
          id: '50000000-0000-0000-0000-000000000008',
          paymentDate: new Date('2026-09-04'),
          amount: '22000.00',
          currency: Currency.USD,
          exchangeRateSheetId: sheet3Id,
          exchangeRateEntryId: null,
          appliedRate: '1.0000',
          amountInClaimCurrency: '22000.00',
          reference: 'SETTLE-USD-15',
        },
      ],
    },
    // 16. OVERPAID (USD) - payout reduced after full payment (payout 15000, paid 20000, balance -5000)
    {
      id: '40000000-0000-0000-0000-000000000016',
      claimReference: 'CLM-2026-000016',
      policyId: policiesData[0].id,
      policyRiskCoverId: policiesData[0].covers[0].id,
      currency: Currency.USD,
      lossDate: new Date('2026-03-05'),
      dateNotified: new Date('2026-03-08'),
      lossNature: 'Crusher unit belt snapping.',
      estimatedLossAmount: '25000.00',
      approvedPayoutAmount: '15000.00',
      version: 3,
      review: {
        id: '41000000-0000-0000-0000-000000000016',
        decision: ReviewDecision.APPROVED,
        reason: 'Claim approved and salvage recovery agreed.',
      },
      payments: [
        {
          id: '50000000-0000-0000-0000-000000000009',
          paymentDate: new Date('2026-03-25'),
          amount: '20000.00',
          currency: Currency.USD,
          exchangeRateSheetId: sheet1Id,
          exchangeRateEntryId: null,
          appliedRate: '1.0000',
          amountInClaimCurrency: '20000.00',
          reference: 'INIT-PAY-USD-16',
        },
      ],
    },
    // 17. OVERPAID (GHS) - payment exceeded revised payout
    {
      id: '40000000-0000-0000-0000-000000000017',
      claimReference: 'CLM-2026-000017',
      policyId: policiesData[4].id,
      policyRiskCoverId: policiesData[4].covers[1].id,
      currency: Currency.GHS,
      lossDate: new Date('2026-07-10'),
      dateNotified: new Date('2026-07-12'),
      lossNature: 'Office electronics stolen during night shift.',
      estimatedLossAmount: '40000.00',
      approvedPayoutAmount: '30000.00',
      version: 3,
      review: {
        id: '41000000-0000-0000-0000-000000000017',
        decision: ReviewDecision.APPROVED,
        reason: 'Burglary investigation closed.',
      },
      payments: [
        {
          id: '50000000-0000-0000-0000-000000000010',
          paymentDate: new Date('2026-07-28'),
          amount: '35000.00',
          currency: Currency.GHS,
          exchangeRateSheetId: sheet2Id,
          exchangeRateEntryId: null,
          appliedRate: '1.0000',
          amountInClaimCurrency: '35000.00',
          reference: 'OVER-PAY-GHS-17',
        },
      ],
    },
    // 18. EXPLICIT ZERO PAYOUT (USD) - approved with 0.00 payout
    {
      id: '40000000-0000-0000-0000-000000000018',
      claimReference: 'CLM-2026-000018',
      policyId: policiesData[9].id,
      policyRiskCoverId: policiesData[9].covers[1].id,
      currency: Currency.USD,
      lossDate: new Date('2026-09-04'),
      dateNotified: new Date('2026-09-05'),
      lossNature: 'Poolside umbrella frame bent during gust of wind.',
      estimatedLossAmount: '2000.00',
      approvedPayoutAmount: '0.00',
      version: 2,
      review: {
        id: '41000000-0000-0000-0000-000000000018',
        decision: ReviewDecision.APPROVED,
        reason: 'Cover verified but loss is completely absorbed by the 15,000 deductible; agreed settlement is 0.00.',
      },
      payments: [],
    },
  ];

  for (const c of claimsData) {
    const existing = await prisma.claim.findUnique({ where: { id: c.id } });
    if (!existing) {
      await prisma.claim.create({
        data: {
          id: c.id,
          claimReference: c.claimReference,
          policyId: c.policyId,
          policyRiskCoverId: c.policyRiskCoverId,
          currency: c.currency,
          lossDate: c.lossDate,
          dateNotified: c.dateNotified,
          lossNature: c.lossNature,
          estimatedLossAmount: c.estimatedLossAmount,
          approvedPayoutAmount: c.approvedPayoutAmount,
          version: c.version,
          createdBy: 'seed_system',
          ...(c.review
            ? {
                review: {
                  create: {
                    id: c.review.id,
                    decision: c.review.decision,
                    reason: c.review.reason,
                    reviewedBy: 'seed_adjuster',
                  },
                },
              }
            : {}),
          ...(c.payments && c.payments.length > 0
            ? {
                payments: {
                  create: c.payments.map((p) => ({
                    id: p.id,
                    paymentDate: p.paymentDate,
                    amount: p.amount,
                    currency: p.currency,
                    exchangeRateSheetId: p.exchangeRateSheetId,
                    exchangeRateEntryId: p.exchangeRateEntryId,
                    appliedRate: p.appliedRate,
                    amountInClaimCurrency: p.amountInClaimCurrency,
                    reference: p.reference,
                    createdBy: 'seed_system',
                  })),
                },
              }
            : {}),
        },
      });
    }
  }
  console.log(`Seeded ${claimsData.length} claims with reviews and payments.`);

  // Synchronize PostgreSQL sequences so subsequent API calls generate collision-free numbers
  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval('policy_seq', GREATEST((SELECT COUNT(*) FROM policies), 1), true)`
    );
    await prisma.$executeRawUnsafe(
      `SELECT setval('claim_seq', GREATEST((SELECT COUNT(*) FROM claims), 1), true)`
    );
    await prisma.$executeRawUnsafe(
      `SELECT setval('fx_sheet_seq', GREATEST((SELECT COUNT(*) FROM exchange_rate_sheets), 1), true)`
    );
    console.log('Synchronized PostgreSQL sequences.');
  } catch (err: any) {
    console.warn('Could not synchronize sequences:', err.message);
  }

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
