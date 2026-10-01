# QuorumVault Local Development Guide

## Prerequisites

1. **Java Development Kit (JDK 17+)**:
   ```bash
   java -version
   # Expected: OpenJDK 17+ (e.g. Temurin-17.0.20.1)
   ```

2. **Daml Package Manager (`dpm`)**:
   ```bash
   dpm --version
   ```

3. **Node.js (v18+) & npm (v9+)**:
   ```bash
   node --version
   npm --version
   ```

---

## Daml Smart Contract Workflow

### 1. Build the Contract DAR
Compile `daml/Vault.daml` into a Daml Archive (`.dar`):
```bash
dpm build
```
The output DAR will be generated in `.daml/dist/quorumvault-0.1.0.dar`.

### 2. Run Daml Script Tests
Execute the comprehensive test suite in `daml/Test.daml`:
```bash
dpm test
```

### 3. Inspect the Built DAR
To determine the exact Package ID for frontend configuration:
```bash
dpm inspect-dar .daml/dist/quorumvault-0.1.0.dar
```
Look for `package-id: <hash>` in the output.

---

## Frontend Development Workflow

### 1. Install Dependencies
```bash
cd frontend
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the values:
```env
NEXT_PUBLIC_CANTON_NETWORK=localnet
NEXT_PUBLIC_CANTON_LEDGER_API=http://localhost:7575
NEXT_PUBLIC_CANTON_SCAN_API=http://localhost:4000
NEXT_PUBLIC_VAULT_PACKAGE_ID=<your-built-package-id>
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Typecheck and Build
```bash
npm run typecheck
npm run build
```

---

## Canton LocalNet Testing

To run full integration tests against Canton LocalNet:
1. Start Canton LocalNet participant nodes (via `scripts/localnet/`).
2. Upload the `quorumvault-0.1.0.dar` to the local participant ledger.
3. Configure `NEXT_PUBLIC_CANTON_LEDGER_API` to point to the local HTTP JSON API.
