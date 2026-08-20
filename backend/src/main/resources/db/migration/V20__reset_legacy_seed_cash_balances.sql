-- V20: Reset any legacy default seed cash balances to 0.00
UPDATE accounts SET cash_balance = 0.00 WHERE cash_balance = 10000.00;
