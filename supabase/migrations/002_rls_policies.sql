-- ============================================================
-- ZFA — Row Level Security Policies
-- Only authenticated users (staff) can access data.
-- ============================================================

ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients         ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions    ENABLE ROW LEVEL SECURITY;

-- COMPANIES
CREATE POLICY "Authenticated users can read companies"
  ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert companies"
  ON companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update companies"
  ON companies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete companies"
  ON companies FOR DELETE TO authenticated USING (true);

-- CLIENTS
CREATE POLICY "Authenticated users can read clients"
  ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete clients"
  ON clients FOR DELETE TO authenticated USING (true);

-- ACCOUNTS
CREATE POLICY "Authenticated users can read accounts"
  ON accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert accounts"
  ON accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update accounts"
  ON accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete accounts"
  ON accounts FOR DELETE TO authenticated USING (true);

-- ACCOUNT_ALIASES
CREATE POLICY "Authenticated users can read account_aliases"
  ON account_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert account_aliases"
  ON account_aliases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update account_aliases"
  ON account_aliases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete account_aliases"
  ON account_aliases FOR DELETE TO authenticated USING (true);

-- TRANSACTIONS
CREATE POLICY "Authenticated users can read transactions"
  ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transactions"
  ON transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update transactions"
  ON transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete transactions"
  ON transactions FOR DELETE TO authenticated USING (true);
