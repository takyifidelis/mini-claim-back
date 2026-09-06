-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('GHS', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "RiskCoverStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'DENIED');

-- CreateSequences
CREATE SEQUENCE IF NOT EXISTS "fx_sheet_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "policy_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS "claim_seq" START WITH 1 INCREMENT BY 1;

-- CreateTable
CREATE TABLE "risk_covers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RiskCoverStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "risk_covers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_sheets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference" VARCHAR(50) NOT NULL,
    "effectiveAt" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "exchange_rate_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "exchangeRateSheetId" UUID NOT NULL,
    "fromCurrency" "Currency" NOT NULL,
    "toCurrency" "Currency" NOT NULL,
    "rate" DECIMAL(23,8) NOT NULL,

    CONSTRAINT "exchange_rate_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "exchange_rate_entries_rate_check" CHECK ("rate" > 0),
    CONSTRAINT "exchange_rate_entries_currency_check" CHECK ("fromCurrency" <> "toCurrency")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policyNumber" VARCHAR(50) NOT NULL,
    "insuredName" VARCHAR(200) NOT NULL,
    "policyType" VARCHAR(100) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "currency" "Currency" NOT NULL,
    "premiumAmount" DECIMAL(17,2),
    "sumInsured" DECIMAL(17,2) NOT NULL,
    "exchangeRateSheetId" UUID NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "policies_dates_check" CHECK ("startDate" <= "endDate"),
    CONSTRAINT "policies_sum_insured_check" CHECK ("sumInsured" >= 0),
    CONSTRAINT "policies_premium_amount_check" CHECK ("premiumAmount" IS NULL OR "premiumAmount" >= 0)
);

-- CreateTable
CREATE TABLE "policy_risk_covers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "policyId" UUID NOT NULL,
    "riskCoverId" UUID NOT NULL,
    "coverCodeSnapshot" VARCHAR(50) NOT NULL,
    "coverNameSnapshot" VARCHAR(200) NOT NULL,
    "coverageLimit" DECIMAL(17,2) NOT NULL,
    "deductibleAmount" DECIMAL(17,2) NOT NULL DEFAULT 0,
    "terms" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "policy_risk_covers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "policy_risk_covers_limit_check" CHECK ("coverageLimit" > 0),
    CONSTRAINT "policy_risk_covers_deductible_check" CHECK ("deductibleAmount" >= 0 AND "deductibleAmount" <= "coverageLimit")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claimReference" VARCHAR(50) NOT NULL,
    "policyId" UUID NOT NULL,
    "policyRiskCoverId" UUID NOT NULL,
    "currency" "Currency" NOT NULL,
    "lossDate" DATE NOT NULL,
    "dateNotified" DATE NOT NULL,
    "lossNature" TEXT NOT NULL,
    "estimatedLossAmount" DECIMAL(17,2) NOT NULL,
    "approvedPayoutAmount" DECIMAL(17,2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "claims_dates_check" CHECK ("lossDate" <= "dateNotified"),
    CONSTRAINT "claims_estimated_loss_check" CHECK ("estimatedLossAmount" >= 0),
    CONSTRAINT "claims_approved_payout_check" CHECK ("approvedPayoutAmount" IS NULL OR "approvedPayoutAmount" >= 0),
    CONSTRAINT "claims_version_check" CHECK ("version" >= 1)
);

-- CreateTable
CREATE TABLE "claim_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claimId" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "claim_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "claimId" UUID NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amount" DECIMAL(17,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "exchangeRateSheetId" UUID NOT NULL,
    "exchangeRateEntryId" UUID,
    "appliedRate" DECIMAL(23,8) NOT NULL,
    "amountInClaimCurrency" DECIMAL(17,2) NOT NULL,
    "reference" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(100) NOT NULL,

    CONSTRAINT "claim_payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "claim_payments_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "claim_payments_applied_rate_check" CHECK ("appliedRate" > 0),
    CONSTRAINT "claim_payments_amount_converted_check" CHECK ("amountInClaimCurrency" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "risk_covers_code_key" ON "risk_covers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_sheets_reference_key" ON "exchange_rate_sheets"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_sheets_effectiveAt_key" ON "exchange_rate_sheets"("effectiveAt");

-- CreateIndex
CREATE INDEX "exchange_rate_sheets_effectiveAt_idx" ON "exchange_rate_sheets"("effectiveAt" DESC);

-- CreateIndex
CREATE INDEX "exchange_rate_entries_exchangeRateSheetId_fromCurrency_toCurr_idx" ON "exchange_rate_entries"("exchangeRateSheetId", "fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rate_entries_exchangeRateSheetId_fromCurrency_toCurr_key" ON "exchange_rate_entries"("exchangeRateSheetId", "fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "policies_policyNumber_key" ON "policies"("policyNumber");

-- CreateIndex
CREATE INDEX "policies_policyNumber_idx" ON "policies"("policyNumber");

-- CreateIndex
CREATE INDEX "policies_insuredName_idx" ON "policies"("insuredName");

-- CreateIndex
CREATE INDEX "policies_status_idx" ON "policies"("status");

-- CreateIndex
CREATE INDEX "policies_currency_idx" ON "policies"("currency");

-- CreateIndex
CREATE INDEX "policies_createdAt_idx" ON "policies"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "policy_risk_covers_policyId_riskCoverId_key" ON "policy_risk_covers"("policyId", "riskCoverId");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claimReference_key" ON "claims"("claimReference");

-- CreateIndex
CREATE INDEX "claims_claimReference_idx" ON "claims"("claimReference");

-- CreateIndex
CREATE INDEX "claims_policyId_idx" ON "claims"("policyId");

-- CreateIndex
CREATE INDEX "claims_policyRiskCoverId_idx" ON "claims"("policyRiskCoverId");

-- CreateIndex
CREATE INDEX "claims_dateNotified_idx" ON "claims"("dateNotified");

-- CreateIndex
CREATE INDEX "claims_currency_idx" ON "claims"("currency");

-- CreateIndex
CREATE INDEX "claims_createdAt_idx" ON "claims"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "claim_reviews_claimId_key" ON "claim_reviews"("claimId");

-- CreateIndex
CREATE INDEX "claim_payments_claimId_paymentDate_idx" ON "claim_payments"("claimId", "paymentDate");

-- CreateIndex
CREATE INDEX "claim_payments_claimId_createdAt_idx" ON "claim_payments"("claimId", "createdAt");

-- AddForeignKey
ALTER TABLE "exchange_rate_entries" ADD CONSTRAINT "exchange_rate_entries_exchangeRateSheetId_fkey" FOREIGN KEY ("exchangeRateSheetId") REFERENCES "exchange_rate_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_exchangeRateSheetId_fkey" FOREIGN KEY ("exchangeRateSheetId") REFERENCES "exchange_rate_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_risk_covers" ADD CONSTRAINT "policy_risk_covers_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_risk_covers" ADD CONSTRAINT "policy_risk_covers_riskCoverId_fkey" FOREIGN KEY ("riskCoverId") REFERENCES "risk_covers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policyRiskCoverId_fkey" FOREIGN KEY ("policyRiskCoverId") REFERENCES "policy_risk_covers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_reviews" ADD CONSTRAINT "claim_reviews_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_payments" ADD CONSTRAINT "claim_payments_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_payments" ADD CONSTRAINT "claim_payments_exchangeRateSheetId_fkey" FOREIGN KEY ("exchangeRateSheetId") REFERENCES "exchange_rate_sheets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claim_payments" ADD CONSTRAINT "claim_payments_exchangeRateEntryId_fkey" FOREIGN KEY ("exchangeRateEntryId") REFERENCES "exchange_rate_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database-level Immutability Trigger for ExchangeRateSheet and ExchangeRateEntry
CREATE OR REPLACE FUNCTION prevent_exchange_rate_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Exchange rate records are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_immutable_exchange_rate_sheets ON "exchange_rate_sheets";
CREATE TRIGGER trigger_immutable_exchange_rate_sheets
BEFORE UPDATE OR DELETE ON "exchange_rate_sheets"
FOR EACH ROW EXECUTE FUNCTION prevent_exchange_rate_modification();

DROP TRIGGER IF EXISTS trigger_immutable_exchange_rate_entries ON "exchange_rate_entries";
CREATE TRIGGER trigger_immutable_exchange_rate_entries
BEFORE UPDATE OR DELETE ON "exchange_rate_entries"
FOR EACH ROW EXECUTE FUNCTION prevent_exchange_rate_modification();
