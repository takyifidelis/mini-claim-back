import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActorProvider } from '../../common/providers/actor.provider.js';
import { DecimalMath, DecimalInstance } from '../../common/utils/decimal.util.js';
import { CreateClaimPaymentDto } from './dto/create-claim-payment.dto.js';
import { QueryClaimPaymentsDto } from './dto/query-claim-payments.dto.js';
import { ClaimPaymentResponseDto } from './dto/claim-payment-response.dto.js';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto.js';

@Injectable()
export class ClaimPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actorProvider: ActorProvider,
  ) {}

  /**
   * Creates an immutable claim payment using the policy's locked exchange rates.
   *
   * @param claimId - UUID of the claim
   * @param dto - Payment creation parameters
   * @returns Created payment response DTO
   */
  async create(claimId: string, dto: CreateClaimPaymentDto): Promise<ClaimPaymentResponseDto> {
    const paymentDate = new Date(dto.paymentDate);
    if (isNaN(paymentDate.getTime())) {
      throw new BadRequestException('Invalid paymentDate format.');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      // 1. Lock and load claim with policy and locked rate sheet
      const claim = await tx.claim.findUnique({
        where: { id: claimId },
        include: {
          policy: {
            include: {
              exchangeRateSheet: {
                include: {
                  entries: true,
                },
              },
            },
          },
          review: true,
          payments: true,
        },
      });

      if (!claim) {
        throw new NotFoundException(`Claim with ID "${claimId}" not found.`);
      }

      // 2. Must have an approved review
      if (!claim.review || claim.review.decision !== 'APPROVED') {
        throw new UnprocessableEntityException(
          'Payments can only be recorded against review-approved claims.'
        );
      }

      // 3. Must have a non-null approved payout
      if (claim.approvedPayoutAmount === null || claim.approvedPayoutAmount === undefined) {
        throw new UnprocessableEntityException(
          'Cannot record payment on a claim without an approved payout amount.'
        );
      }

      // 4. Optimistic concurrency check
      if (claim.version !== dto.expectedVersion) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            code: 'CLAIM_VERSION_CONFLICT',
            message: `Claim version conflict. Expected version ${dto.expectedVersion}, but current version is ${claim.version}.`,
            details: { currentVersion: claim.version, expectedVersion: dto.expectedVersion },
          },
          HttpStatus.CONFLICT
        );
      }

      // 5. Cross-currency conversion via policy's locked exchange rate sheet
      const lockedSheet = claim.policy.exchangeRateSheet;
      let appliedRateStr: string;
      let entryId: string | null = null;
      let amountInClaimCurrencyDec: any;

      if (dto.currency === claim.currency) {
        appliedRateStr = '1.0000';
        entryId = null;
        amountInClaimCurrencyDec = DecimalMath.from(dto.amount).toDecimalPlaces(2, DecimalInstance.ROUND_HALF_UP);
      } else {
        const entry = lockedSheet.entries.find(
          (e) => e.fromCurrency === dto.currency && e.toCurrency === claim.currency
        );

        if (!entry) {
          throw new UnprocessableEntityException(
            `Policy locked rate sheet "${lockedSheet.reference}" does not contain conversion rate for ${dto.currency}->${claim.currency}.`
          );
        }

        entryId = entry.id;
        appliedRateStr = DecimalMath.formatRate(entry.rate);
        amountInClaimCurrencyDec = DecimalMath.convert(dto.amount, entry.rate);

        if (
          DecimalMath.isZero(amountInClaimCurrencyDec) ||
          DecimalMath.isGreaterThan(amountInClaimCurrencyDec, '999999999999999.99')
        ) {
          throw new BadRequestException(
            `Converted payment amount (${amountInClaimCurrencyDec.toString()}) is out of valid bounds.`
          );
        }
      }

      // 6. Balance & Overpayment check
      const currentTotalPaidDec = (claim.payments || []).reduce(
        (sum, p) => DecimalMath.add(sum, p.amountInClaimCurrency),
        DecimalMath.from(0)
      );

      const newTotalPaidDec = DecimalMath.add(currentTotalPaidDec, amountInClaimCurrencyDec);
      const newBalanceDec = DecimalMath.sub(claim.approvedPayoutAmount, newTotalPaidDec);

      if (DecimalMath.isNegative(newBalanceDec) && !dto.confirmOverpayment) {
        const absoluteOverpayment = DecimalMath.formatMoney(DecimalMath.abs(newBalanceDec));
        const proposedSignedBalance = DecimalMath.formatMoney(newBalanceDec);

        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
            message: 'This payment would overpay the claim.',
            details: {
              proposedSignedBalance,
              absoluteOverpayment,
              currency: claim.currency,
              currentClaimVersion: claim.version,
            },
          },
          HttpStatus.CONFLICT
        );
      }

      const createdBy = this.actorProvider.getActor();

      // 7. Create payment and atomically increment parent claim version
      const createdPayment = await tx.claimPayment.create({
        data: {
          claimId: claim.id,
          paymentDate,
          amount: DecimalMath.from(dto.amount).toFixed(2),
          currency: dto.currency,
          exchangeRateSheetId: lockedSheet.id,
          exchangeRateEntryId: entryId,
          appliedRate: appliedRateStr,
          amountInClaimCurrency: amountInClaimCurrencyDec.toFixed(2),
          reference: dto.reference,
          createdBy,
        },
      });

      const updateRes = await tx.claim.updateMany({
        where: { id: claim.id, version: dto.expectedVersion },
        data: {
          version: claim.version + 1,
          updatedAt: new Date(),
        },
      });

      if (updateRes.count === 0) {
        throw new HttpException(
          {
            statusCode: HttpStatus.CONFLICT,
            code: 'CLAIM_VERSION_CONFLICT',
            message: `Claim was modified concurrently. Expected version ${dto.expectedVersion}.`,
            details: { expectedVersion: dto.expectedVersion },
          },
          HttpStatus.CONFLICT
        );
      }

      return createdPayment;
    });

    return ClaimPaymentResponseDto.fromEntity(payment);
  }

  /**
   * Finds all payments for a claim with pagination.
   *
   * @param claimId - UUID of the claim
   * @param query - Pagination query
   * @returns Paginated list of payments
   */
  async findAllByClaim(
    claimId: string,
    query: QueryClaimPaymentsDto
  ): Promise<PaginatedResponseDto<ClaimPaymentResponseDto>> {
    const { page = 1, pageSize = 10, search, sortBy, sortDirection = 'desc' } = query;

    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
    });

    if (!claim) {
      throw new NotFoundException(`Claim with ID "${claimId}" not found.`);
    }

    const where: Prisma.ClaimPaymentWhereInput = {
      claimId,
    };

    if (search && search.trim()) {
      where.reference = { contains: search.trim(), mode: 'insensitive' };
    }

    const validSortFields = ['paymentDate', 'amount', 'createdAt'];
    const sortField = sortBy && validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const orderBy: Prisma.ClaimPaymentOrderByWithRelationInput[] = [
      { [sortField]: sortDirection },
      { id: 'asc' },
    ];

    const [totalItems, records] = await Promise.all([
      this.prisma.claimPayment.count({ where }),
      this.prisma.claimPayment.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = records.map((p) => ClaimPaymentResponseDto.fromEntity(p));
    return new PaginatedResponseDto(items, totalItems, page, pageSize);
  }
}
