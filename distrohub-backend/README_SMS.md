# SMS Notification Feature Implementation

## Overview
SMS notification feature has been implemented using mimsms.com API. The feature includes:
- Configurable SMS settings per event type
- Customizable message templates
- Immediate and queued delivery modes
- SMS queue processing with retry logic
- SMS logs and history
- Integration with existing events (low stock, expiry alerts, payment due, new orders)

## Environment Variables

Add these to your backend environment (Render/Railway):

```
MIMSMS_USERNAME=your_email@example.com
MIMSMS_API_KEY=your_api_key_from_mimsms
MIMSMS_SENDER_NAME=DistroHub
MIMSMS_ENABLED=true
```

## Database Migration

Run the migration file to create SMS tables:
```bash
# Apply the migration in Supabase
# File: distrohub-backend/supabase/migrations/20260103000000_sms_notifications.sql
```

## Backend Implementation

### Files Created/Modified:
1. **distrohub-backend/app/sms_service.py** - SMS service with mimsms.com integration
2. **distrohub-backend/app/sms_worker.py** - Background worker for processing SMS queue
3. **distrohub-backend/app/models.py** - Added SMS-related Pydantic models
4. **distrohub-backend/app/supabase_db.py** - Added SMS database methods
5. **distrohub-backend/app/main.py** - Added SMS API endpoints and event triggers
6. **distrohub-backend/requirements.txt** - Added httpx dependency

### API Endpoints:
- `GET /api/sms/settings` - Get SMS settings
- `PUT /api/sms/settings` - Update SMS settings
- `GET /api/sms/templates` - Get all templates
- `GET /api/sms/templates/{event_type}` - Get template by event type
- `POST /api/sms/templates` - Create template (admin only)
- `PUT /api/sms/templates/{template_id}` - Update template (admin only)
- `GET /api/sms/logs` - Get SMS logs
- `GET /api/sms/balance` - Check mimsms.com balance
- `POST /api/sms/test` - Send test SMS
- `POST /api/sms/send` - Send SMS immediately

## Frontend Implementation

### Files Created/Modified:
1. **distrohub-frontend/src/types/index.ts** - Added SMS TypeScript interfaces
2. **distrohub-frontend/src/lib/smsApi.ts** - SMS API service functions
3. **distrohub-frontend/src/pages/Settings.tsx** - Updated with SMS settings UI

### Features:
- SMS notification settings per event type
- Delivery mode selection (immediate/queued)
- SMS template management
- SMS logs/history view

## Event Triggers

SMS notifications are automatically triggered for:
1. **Low Stock** - When product stock < reorder_level (on product create/update)
2. **Expiry Alert** - When product expires in <= 30 days (on purchase create)
3. **Payment Due** - When retailer has overdue payment (can be triggered from dashboard)
4. **New Order** - When new sale is created

## Testing

1. Set up mimsms.com account and get API credentials
2. Add environment variables to backend
3. Run database migration
4. Test SMS sending via `/api/sms/test` endpoint
5. Configure SMS settings in frontend
6. Trigger events and verify SMS delivery

## Notes

- SMS worker runs in background and processes queue every 60 seconds
- Failed SMS are retried up to 3 times
- All SMS activity is logged in `sms_logs` table
- Phone numbers are automatically formatted for Bangladesh (+880 format)

