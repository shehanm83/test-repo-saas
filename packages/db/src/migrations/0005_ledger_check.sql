ALTER TABLE credit_ledger_entries
ADD CONSTRAINT ledger_balance_after_nonneg CHECK (balance_after >= 0);
