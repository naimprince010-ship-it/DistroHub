-- SMS Notifications Feature Migration
-- Creates tables for SMS settings, templates, queue, and logs

-- SMS Settings: User/role-based SMS preferences
CREATE TABLE IF NOT EXISTS sms_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'admin', 'sales_rep', 'retailer', 'supplier'
    event_type TEXT NOT NULL, -- 'low_stock', 'expiry_alert', 'payment_due', 'new_order'
    enabled BOOLEAN DEFAULT true,
    delivery_mode TEXT DEFAULT 'immediate', -- 'immediate' or 'queued'
    recipients TEXT[], -- Array of recipient types: ['admins', 'retailers', 'suppliers']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, event_type),
    UNIQUE(role, event_type)
);

-- SMS Templates: Customizable message templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL UNIQUE, -- 'low_stock', 'expiry_alert', 'payment_due', 'new_order'
    template_text TEXT NOT NULL,
    variables TEXT[], -- Available variables for this template
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Queue: Queued SMS messages for batch processing
CREATE TABLE IF NOT EXISTS sms_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Logs: SMS delivery history
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL, -- 'sent', 'failed', 'delivered', 'undelivered'
    trxn_id TEXT, -- Transaction ID from mimsms.com
    delivery_status TEXT, -- Delivery status from mimsms.com
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sms_settings_user_id ON sms_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_settings_role ON sms_settings(role);
CREATE INDEX IF NOT EXISTS idx_sms_settings_event_type ON sms_settings(event_type);
CREATE INDEX IF NOT EXISTS idx_sms_templates_event_type ON sms_templates(event_type);
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_scheduled_at ON sms_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient_phone ON sms_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_event_type ON sms_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at);

-- Insert default templates
INSERT INTO sms_templates (event_type, template_text, variables, is_default) VALUES
('low_stock', 'Alert: {product_name} stock is low ({current_stock} units). Reorder level: {reorder_level}', 
 ARRAY['product_name', 'current_stock', 'reorder_level'], true),
('expiry_alert', 'Warning: {product_name} (Batch: {batch_number}) expires on {expiry_date} ({days_remaining} days remaining)', 
 ARRAY['product_name', 'batch_number', 'expiry_date', 'days_remaining'], true),
('payment_due', 'Reminder: {retailer_name}, your payment of ৳{due_amount} is due. Invoice: {invoice_number}', 
 ARRAY['retailer_name', 'due_amount', 'invoice_number'], true),
('new_order', 'New order #{order_number} from {retailer_name} for ৳{total_amount}', 
 ARRAY['order_number', 'retailer_name', 'total_amount'], true)
ON CONFLICT (event_type) DO NOTHING;

-- RLS Policies (if RLS is enabled)
ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Policies for sms_settings: Users can only see their own settings, admins can see all
CREATE POLICY "Users can view their own SMS settings" ON sms_settings
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Users can update their own SMS settings" ON sms_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SMS settings" ON sms_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for sms_templates: Only admins can manage templates
CREATE POLICY "Admins can manage SMS templates" ON sms_templates
    FOR ALL USING (EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Policies for sms_queue: Only admins can view queue
CREATE POLICY "Admins can view SMS queue" ON sms_queue
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Policies for sms_logs: Users can view logs for their own phone number, admins can view all
CREATE POLICY "Users can view their own SMS logs" ON sms_logs
    FOR SELECT USING (
        recipient_phone IN (
            SELECT phone FROM users WHERE id = auth.uid()
        ) OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

