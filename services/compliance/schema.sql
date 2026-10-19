-- AION Workforce - Enterprise Shift Management
-- PostgreSQL Schema (Multi-tenant, Legal Compliance, RGPD)

-- Tenants (Multi-tenant core)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    country_code VARCHAR(2) DEFAULT 'ES',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant Roles (RBAC)
CREATE TABLE IF NOT EXISTS tenant_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner','admin','squad_lead','operator','employee','auditor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    contract_type VARCHAR(50) DEFAULT 'indefinido',
    weekly_hours DECIMAL(4,1) DEFAULT 40.0,
    skills JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shift Templates
CREATE TABLE IF NOT EXISTS shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INT DEFAULT 0,
    is_night BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts (Scheduled)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID REFERENCES shift_templates(id),
    employee_id UUID REFERENCES employees(id),
    date DATE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Absences (16+ types)
CREATE TABLE IF NOT EXISTS absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) NOT NULL,
    absence_type VARCHAR(50) NOT NULL CHECK (absence_type IN (
        'vacation','sick_leave','personal_leave','maternity','paternity',
        'training','jury_duty','bereavement','unpaid_leave','remote_work',
        'medical_appointment','half_day','compensatory','strike','other'
    )),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    coverage_impact JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Rules (Versioned)
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(10) NOT NULL,
    law_reference VARCHAR(255) NOT NULL,
    article VARCHAR(100),
    severity VARCHAR(20) CHECK (severity IN ('info','warning','hard_stop')),
    parameters JSONB NOT NULL DEFAULT '{}',
    version INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft','active','deprecated')),
    effective_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance Violations
CREATE TABLE IF NOT EXISTS compliance_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES compliance_rules(id),
    shift_id UUID REFERENCES shifts(id),
    employee_id UUID REFERENCES employees(id),
    violation_type VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs (RGPD immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Rules
CREATE TABLE IF NOT EXISTS payroll_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) CHECK (rule_type IN ('base','night_premium','holiday_premium','overtime','seniority')),
    formula JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RTA Events (Real-Time Adherence)
CREATE TABLE IF NOT EXISTS rta_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    shift_id UUID REFERENCES shifts(id),
    event_type VARCHAR(50) CHECK (event_type IN ('clock_in','clock_out','break_start','break_end','late','absent')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shifts_tenant_date ON shifts(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_employee ON absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_tenant ON compliance_rules(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rta_employee ON rta_events(employee_id, timestamp);

-- Insert default compliance rules for Spain
INSERT INTO compliance_rules (tenant_id, rule_name, jurisdiction, law_reference, article, severity, parameters, effective_date)
SELECT 
    t.id,
    'Daily Rest (12h)',
    'ES',
    'Estatuto de los Trabajadores',
    'Art. 34.3',
    'hard_stop',
    '{"min_hours": 12}'::jsonb,
    '2000-01-01'
FROM tenants t
ON CONFLICT DO NOTHING;

INSERT INTO compliance_rules (tenant_id, rule_name, jurisdiction, law_reference, article, severity, parameters, effective_date)
SELECT 
    t.id,
    'Weekly Rest (36h)',
    'ES',
    'Estatuto de los Trabajadores',
    'Art. 37.1',
    'hard_stop',
    '{"min_hours": 36}'::jsonb,
    '2000-01-01'
FROM tenants t
ON CONFLICT DO NOTHING;

INSERT INTO compliance_rules (tenant_id, rule_name, jurisdiction, law_reference, article, severity, parameters, effective_date)
SELECT 
    t.id,
    'Max Weekly Hours (40h avg)',
    'ES',
    'Directiva 2003/88/CE',
    'Art. 6',
    'warning',
    '{"max_weekly_avg": 40}'::jsonb,
    '2000-01-01'
FROM tenants t
ON CONFLICT DO NOTHING;
