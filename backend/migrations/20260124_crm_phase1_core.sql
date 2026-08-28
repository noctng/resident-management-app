-- Migration: CRM Phase 1 - Core Business Logic Tables
-- Created: 2026-01-24
-- Description: Add tables for contract lifecycle, payment schedules, handover, and approvals

-- 1. Contract Lifecycle Events
CREATE TABLE IF NOT EXISTS contract_lifecycle_events (
  id VARCHAR(255) PRIMARY KEY,
  contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- DEPOSIT, SIGNED, AMENDED, TRANSFERRED, CANCELLED, COMPLETED
  event_date TIMESTAMPTZ DEFAULT NOW(),
  performed_by VARCHAR(255),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_contract ON contract_lifecycle_events(contract_id);
CREATE INDEX idx_lifecycle_type ON contract_lifecycle_events(event_type);

-- 2. Payment Schedules
CREATE TABLE IF NOT EXISTS payment_schedules (
  id VARCHAR(255) PRIMARY KEY,
  contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  schedule_name VARCHAR(255),
  policy_type VARCHAR(50), -- MILESTONE_BASED, TIME_BASED, CUSTOM
  late_fee_rate DECIMAL(5,2) DEFAULT 0, -- % per day
  grace_period_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX idx_payment_schedule_contract ON payment_schedules(contract_id);

-- 3. Extend contract_payments table
ALTER TABLE contract_payments 
  ADD COLUMN IF NOT EXISTS late_fee DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_overdue INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_calculated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_schedule_id VARCHAR(255) REFERENCES payment_schedules(id);

CREATE INDEX IF NOT EXISTS idx_payments_overdue ON contract_payments(status, due_date) WHERE status = 'OVERDUE';

-- 4. Handover Checklists
CREATE TABLE IF NOT EXISTS handover_checklists (
  id VARCHAR(255) PRIMARY KEY,
  contract_id VARCHAR(255) NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  item_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_handover_contract ON handover_checklists(contract_id);

-- 5. Approval Workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
  id VARCHAR(255) PRIMARY KEY,
  request_type VARCHAR(50) NOT NULL, -- EXTENSION, DISCOUNT, TRANSFER, CANCELLATION
  contract_id VARCHAR(255) REFERENCES contracts(id) ON DELETE CASCADE,
  requested_by VARCHAR(255) NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  approver_id VARCHAR(255),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  request_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_status ON approval_workflows(status);
CREATE INDEX idx_approval_contract ON approval_workflows(contract_id);
CREATE INDEX idx_approval_type ON approval_workflows(request_type);

-- 6. Add handover fields to contracts
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS handover_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS handover_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS title_deed_issued BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS title_deed_date TIMESTAMPTZ;

-- 7. Create view for contract financial summary
CREATE OR REPLACE VIEW contract_financial_summary AS
SELECT 
  c.id as contract_id,
  c.contract_code,
  c.total_value,
  c.status,
  COALESCE(SUM(cp.paid_amount), 0) as total_paid,
  COALESCE(SUM(cp.amount), 0) as total_scheduled,
  COALESCE(SUM(CASE WHEN cp.status = 'OVERDUE' THEN cp.amount - cp.paid_amount ELSE 0 END), 0) as total_overdue,
  COALESCE(SUM(cp.late_fee), 0) as total_late_fees,
  ROUND((COALESCE(SUM(cp.paid_amount), 0) / NULLIF(c.total_value, 0)) * 100, 2) as payment_percentage,
  COUNT(CASE WHEN cp.status = 'PENDING' THEN 1 END) as pending_payments,
  COUNT(CASE WHEN cp.status = 'OVERDUE' THEN 1 END) as overdue_payments
FROM contracts c
LEFT JOIN contract_payments cp ON c.id = cp.contract_id
GROUP BY c.id, c.contract_code, c.total_value, c.status;

-- 8. Create function to auto-update payment status
CREATE OR REPLACE FUNCTION update_payment_overdue_status()
RETURNS void AS $$
BEGIN
  UPDATE contract_payments
  SET 
    status = 'OVERDUE',
    days_overdue = EXTRACT(DAY FROM (CURRENT_DATE - due_date))::INT
  WHERE 
    status = 'PENDING' 
    AND due_date < CURRENT_DATE
    AND paid_amount < amount;
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON TABLE contract_lifecycle_events IS 'Tracks all lifecycle events for contracts - deposit, signing, amendments, transfers, cancellations';
COMMENT ON TABLE payment_schedules IS 'Defines payment schedule policies for contracts';
COMMENT ON TABLE handover_checklists IS 'Checklist items required before handover can be completed';
COMMENT ON TABLE approval_workflows IS 'Multi-level approval requests for contract modifications';
COMMENT ON VIEW contract_financial_summary IS 'Real-time financial summary for each contract';
