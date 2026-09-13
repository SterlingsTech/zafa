-- ============================================================
-- ZFA Tax Law Firm — Initial Schema
-- ============================================================

-- COMPANIES
CREATE TABLE IF NOT EXISTS companies (
  company_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(255) NOT NULL,
  created_at  timestamp WITH TIME ZONE DEFAULT now()
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  client_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(company_id) ON DELETE SET NULL,
  name       varchar(255) NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
  account_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  account_category varchar(50) NOT NULL CHECK (account_category IN ('Salaried', 'Business', 'Property', 'Other')),
  business_subtype varchar(50) CHECK (business_subtype IN ('Goods', 'Services')),
  group_title      varchar(255),
  created_at       timestamp WITH TIME ZONE DEFAULT now()
);

-- ACCOUNT_ALIASES
CREATE TABLE IF NOT EXISTS account_aliases (
  alias_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  alias_name varchar(255) NOT NULL
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_account_id uuid NOT NULL REFERENCES accounts(account_id) ON DELETE RESTRICT,
  from_account_id   uuid REFERENCES accounts(account_id) ON DELETE SET NULL,
  from_company_id   uuid REFERENCES companies(company_id) ON DELETE SET NULL,
  title             varchar(255) NOT NULL,
  group_title       varchar(255),
  transaction_date  date NOT NULL,
  amount            numeric(15, 2) NOT NULL CHECK (amount > 0),
  transaction_type  varchar(10) NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
  purpose           varchar(50) NOT NULL CHECK (purpose IN ('Pension', 'Salary', 'Bonus', 'Gratuity', 'Other')),
  created_at        timestamp WITH TIME ZONE DEFAULT now()
);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_company_id       ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_client_id       ON accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_account_aliases_account  ON account_aliases(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_target      ON transactions(target_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date        ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_from_acct   ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_co     ON transactions(from_company_id);
