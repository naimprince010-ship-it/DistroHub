# Production Verification: Notification Toggles

## Backend Routes (Verified)

- **GET** `/api/sms/settings` - Returns `List[SmsSettings]` (200 OK)
- **PUT** `/api/sms/settings` - Accepts `SmsSettingsCreate`, returns `SmsSettings` (200 OK)

## Frontend API Calls (Verified)

- `getSmsSettings()` → `api.get('/api/sms/settings')`
- `updateSmsSettings()` → `api.put('/api/sms/settings', settings)`

## Authorization

The `api.ts` interceptor automatically adds:
```javascript
config.headers.Authorization = `Bearer ${token}`;
```

## Expected Network Tab Results

### 1. Page Load (GET Request)

**Request:**
```
GET /api/sms/settings
Headers:
  Authorization: Bearer <token>
```

**Expected Response (200 OK):**
```json
[
  {
    "id": "uuid-here",
    "user_id": "user-id",
    "role": "sales_rep",
    "event_type": "low_stock",
    "enabled": true,
    "delivery_mode": "immediate",
    "recipients": ["admins"],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": "uuid-here",
    "user_id": "user-id",
    "role": "sales_rep",
    "event_type": "expiry_alert",
    "enabled": false,
    "delivery_mode": "immediate",
    "recipients": ["admins"],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

### 2. Toggle Change (PUT Request)

**Request:**
```
PUT /api/sms/settings
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "event_type": "low_stock",
  "enabled": true,
  "delivery_mode": "immediate",
  "recipients": ["admins"]
}
```

**Expected Response (200 OK):**
```json
{
  "id": "uuid-here",
  "user_id": "user-id",
  "role": "sales_rep",
  "event_type": "low_stock",
  "enabled": true,
  "delivery_mode": "immediate",
  "recipients": ["admins"],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## Verification Steps

### Step 1: Open Browser DevTools
1. Navigate to: `https://distrohub-frontend.vercel.app/settings?tab=notifications`
2. Open DevTools (F12)
3. Go to **Network** tab
4. Filter by: `sms/settings`

### Step 2: Verify GET Request on Page Load
1. Refresh the page (Ctrl+Shift+R)
2. Look for: `GET /api/sms/settings`
3. **PASS Criteria:**
   - Status: `200 OK`
   - Request Headers include: `Authorization: Bearer <token>`
   - Response is JSON array (can be empty `[]` or contain settings)

### Step 3: Toggle a Setting
1. Click any toggle (e.g., "Low Stock Alerts")
2. Look for: `PUT /api/sms/settings`
3. **PASS Criteria:**
   - Status: `200 OK`
   - Request Headers include: `Authorization: Bearer <token>`
   - Request Body contains: `event_type`, `enabled`, `delivery_mode`, `recipients`
   - Response is JSON object with updated setting

### Step 4: Verify Persistence
1. After toggle, note the `enabled` value (e.g., `true`)
2. Reload the page (Ctrl+Shift+R)
3. Check the toggle state matches the previous value
4. **PASS Criteria:**
   - Toggle state persists after reload
   - GET request returns the updated setting with correct `enabled` value

## Troubleshooting

### If PUT returns 404/405
- **Check:** Backend route is `@app.put("/api/sms/settings")` ✅ (Verified)
- **Check:** Frontend calls `api.put('/api/sms/settings', ...)` ✅ (Verified)

### If PUT returns 401
- **Check:** `api.ts` interceptor adds `Authorization: Bearer ${token}` ✅ (Verified)
- **Check:** Token exists in `localStorage.getItem('token')`
- **Check:** Token is not expired

### If PUT returns 200 but reload loses state
- **Check:** Backend logs show Supabase upsert/update executed
- **Check:** GET request after PUT returns updated values
- **Check:** Database has the updated record

## Console Logs to Verify

On page load, you should see:
```
[Notifications] Loaded settings: [...]
```

On toggle, you should see:
```
[Notifications] Updated setting: low_stock {...}
```

## Backend Logs Location

Backend logs are written to: `c:\Users\User\DistroHub\.cursor\debug.log`

Look for entries with:
- `"message":"GET /api/sms/settings response"`
- `"message":"PUT /api/sms/settings response"`

These contain the exact JSON responses.
