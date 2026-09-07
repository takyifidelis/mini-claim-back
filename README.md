# Claims Register

A full-stack insurance claims application for managing risk covers, exchange rates, policies, claim reviews, approved payouts, and settlement payments.

## Stack

- Angular frontend
- NestJS REST API
- PostgreSQL with Prisma ORM

## Run locally

### Backend

Ensure PostgreSQL is running, then create `claim-back-new/.env` from its `.env.example` and set a valid `DATABASE_URL`.

```bash
cd claim-back-new
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

The API normally runs at `http://localhost:3000`. Check the configured Swagger path for API documentation.

### Frontend

In another terminal:

```bash
cd claim-front-new
npm install
npm start
```

Open `http://localhost:4200`. Confirm that the frontend API configuration points to the local NestJS URL.

## Assumptions

- GHS is the base currency. Users enter the GHS equivalent of 1 USD and 1 EUR.
- Exchange-rate updates create immutable records; new policies use the latest active rate, while existing policies retain their original rate.
- A policy may have multiple risk covers, but a claim is reviewed against an assigned cover.
- Claims move through review, payout approval, and payment settlement. Denied claims cannot be paid.
- The backend is authoritative for workflow rules and financial calculations.
- Monetary values use exact decimal arithmetic, and overpayments remain visible as negative balances.
- List filtering is applied before totals and server-side pagination. Totals are grouped by claim currency.

## With more time

I would add authentication and role-based authorization, a complete audit history, automated Bank of Ghana exchange-rate integration, stronger concurrency and payment-idempotency controls, broader automated test coverage, monitoring, and more detailed financial reports.
