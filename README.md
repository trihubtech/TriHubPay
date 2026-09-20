# TriHub Recharge Place (TriHub Technologies)
### B2B Multi-Tier Recharge Platform on PERN Stack

An elite, high-performance, cost-effective B2B Multi-Tier Recharge Platform engineered by **TriHub Technologies** on the **PERN stack (PostgreSQL, Express.js, TypeScript, React, Node.js)**. 

Allows mobile shop owners (**Retailers**) to register, load money into a secure upfront prepaid float wallet via **UPI Dynamic QR**, and perform **Mobile Prepaid, DTH TV, and Electricity Bill (EB)** recharges with instant earned commissions.

---

## 1. Core Technical Highlights

- **ACID Atomic Wallet Deductions**: Uses PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) during checkout to guarantee zero double-spending and eliminate concurrency race conditions or multi-tap wallet exploits.
- **Two-Tier Smart Upstream Router**:
  - **Primary**: A1Topup API (Targets 5.2% - 6.0% raw master commission).
  - **Strict 8-Second Request Timeout**: Automatically catches timeouts or provider reject codes.
  - **Automated Failover**: Routes seamlessly to Noble Web Studio / E2E Networks sub-400ms REST channel.
- **Automated Failure Rollback**: If both upstream providers fail, executes an atomic transaction block that marks the transaction `FAILED` and safely refunds 100% of the debited float back to the retailer's wallet ledger with zero data leakage.
- **Dynamic Commission Blending & Per-Shop Overrides**:
  - Global Commission Matrix sets default rates per telecom operator so Platform Admin retains a **5.0% net average margin**.
  - **Shop-Specific Commission Overrides**: Platform Admin can configure custom pass-down rates for individual high-turnover shops.
- **Prepaid Float UPI QR Generator**: Generates standard NPCI-compliant UPI dynamic payment links (`upi://pay?pa=...`) and QR codes.
- **Thermal & Digital Receipts**: Standard 58mm/80mm POS thermal print styling and 1-click WhatsApp customer share button.
- **Anti-Duplication Sliding Window**: 30-second cryptographic payload filter (`user + operator + account + amount`) blocking duplicate parallel clicks.
- **HMAC Webhook Verification**: Validates real-time provider status callbacks using crypto HMAC SHA-256.
- **High-Fidelity Sandbox Simulator**: Runs out of the box with zero external dependencies. Seamlessly switch to production by adding API keys.

---

## 2. Directory Structure

```
recharge_mobile_app/
├── docker-compose.yml             # 1-command PostgreSQL container
├── backend/
│   ├── .env                       # Environment configuration (UAT/Production)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/index.ts        # Central config with fallback parameters
│       ├── db/
│       │   ├── index.ts           # pg.Pool with ACID withTransaction() wrapper
│       │   ├── schema.sql         # Users, Ledger, Commission Matrix, Transactions
│       │   ├── seeds.sql          # Seed data for operators, admin, and retailers
│       │   └── init.ts            # Automated database migration runner
│       ├── middleware/
│       │   ├── auth.ts            # JWT authentication & Role-Based Access Control
│       │   ├── dedup.ts           # 30-second sliding-window duplicate request filter
│       │   └── hmac.ts            # HMAC SHA-256 signature webhook validator
│       ├── services/
│       │   ├── commissionService.ts # Two-tier commission calculator (Shop vs Matrix)
│       │   └── upstream/
│       │       ├── types.ts       # Upstream request/response contracts
│       │       ├── a1topup.ts     # A1Topup client (8s timeout & sandbox simulator)
│       │       ├── nobleWeb.ts    # Noble Web client (sub-400ms & sandbox simulator)
│       │       └── router.ts      # Two-tier orchestrator with failover override
│       ├── controllers/
│       │   ├── authController.ts  # Login, registration, profile
│       │   ├── rechargeController.ts # Atomic ACID checkout & auto-refund
│       │   ├── walletController.ts # Dynamic UPI QR topup & ledger queries
│       │   ├── adminController.ts # Dashboard KPIs, shop balance manager, failover
│       │   ├── operatorController.ts # Operators & popular recharge plans
│       │   └── webhookController.ts # Upstream status callback & async refund
│       ├── routes/index.ts        # Express route definitions
│       ├── tests/
│       │   └── wallet_concurrency.test.ts # Concurrency & row-lock stress test
│       └── server.ts              # Express server entry point
└── frontend/
    ├── package.json
    ├── vite.config.ts             # Vite config with API proxy
    ├── tailwind.config.js         # Corporate fintech design tokens
    ├── index.html                 # PWA & thermal print meta tags
    └── src/
        ├── index.css              # Global styles & 58mm thermal print CSS
        ├── types/index.ts         # TypeScript models
        ├── services/api.ts        # Full API client with resilient fallbacks
        ├── components/
        │   ├── retailer/
        │   │   ├── WalletStrip.tsx          # Real-time balance banner
        │   │   ├── UpiTopupModal.tsx        # Dynamic UPI QR deposit modal
        │   │   ├── RechargeTabs.tsx         # Mobile/DTH/EB forms with live preview
        │   │   ├── LedgerTable.tsx          # History with earned commission tags
        │   │   └── ThermalReceiptModal.tsx  # 58mm POS receipt & WhatsApp share
        │   └── admin/
        │       ├── DashboardKPIs.tsx        # Network volume & net 5% profit KPIs
        │       ├── UserBalanceManager.tsx   # Shop balance adjustment & audit drawer
        │       ├── CommissionMatrixGrid.tsx # Global operator rate editor
        │       ├── ShopCustomCommissionModal.tsx # Per-shop custom rate overrides
        │       ├── FailoverToggle.tsx       # Upstream manual override switch
        │       └── AllTransactionsTable.tsx # Live platform transactions audit
        ├── App.tsx                # Unified navigation with dual-portal switcher
        └── main.tsx
```

---

## 3. Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- Docker (optional, for local PostgreSQL)

### Step 1: Start PostgreSQL (Docker or Cloud)
```bash
# Start local PostgreSQL container with automated schema and seed data
docker compose up -d
```
*(Alternatively, point `DATABASE_URL` in `backend/.env` to your free Supabase or Neon PostgreSQL instance).*

### Step 2: Initialize Database Schema
```bash
cd backend
npm run db:init
```

### Step 3: Run Concurrency & ACID Row-Locking Test
```bash
npm run test:wallet
```

### Step 4: Start Backend Server
```bash
npm run dev
```
Backend runs at `http://localhost:5000` (Healthcheck: `http://localhost:5000/health`).

### Step 5: Start Frontend Application
```bash
cd ../frontend
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## 4. Default Seed Credentials

| Portal / Role | Email / Phone | Password | Initial Float |
| :--- | :--- | :--- | :--- |
| **Platform Master Admin** | `admin@rechargehub.in` / `9876543210` | `Password@123` | ₹5,00,000.00 |
| **Sri Balaji Telecom (Retailer)** | `balaji.telecom@gmail.com` / `9876543220` | `Password@123` | ₹15,420.50 |
| **Murugan Mobile Care (Retailer)**| `murugan.mobiles@gmail.com` / `9876543221`| `Password@123` | ₹8,500.00 |
| **Star Communication (Retailer)** | `star.comm@gmail.com` / `9876543222` | `Password@123` | ₹22,800.75 |

---

## 5. Live Production Keys Integration

In `backend/.env`, replace the placeholder values with your live credentials:
```env
# A1Topup Live Credentials
A1TOPUP_API_URL=https://api.a1topup.com/api/recharge
A1TOPUP_API_TOKEN=YOUR_LIVE_A1_TOKEN
A1TOPUP_DISTRIBUTOR_ID=YOUR_A1_DISTRIBUTOR_ID

# Noble Web Studio / E2E Networks Live Credentials
NOBLE_API_URL=https://api.noblewebstudio.in/v1/recharge
NOBLE_API_KEY=YOUR_LIVE_NOBLE_KEY

# Security & Webhook HMAC Secret
WEBHOOK_HMAC_SECRET=YOUR_SECURE_HMAC_SECRET

# Dynamic UPI Merchant Settings
PLATFORM_UPI_VPA=your_upi_vpa@bank
PLATFORM_UPI_NAME=YOUR_REGISTERED_COMPANY_NAME
```
