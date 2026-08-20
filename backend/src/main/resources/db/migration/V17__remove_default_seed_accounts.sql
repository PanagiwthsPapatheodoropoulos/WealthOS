-- V17: Remove any legacy default seed accounts from existing databases
DELETE FROM users WHERE email IN ('admin@wealthos.dev', 'admin@wealthos.local', 'demo_investor@wealthos.com', 'tester_demo@wealthos.com');
