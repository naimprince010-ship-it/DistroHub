/**
 * SMS API service functions
 */
import { api } from './api';
import type {
  SmsSettings,
  SmsSettingsCreate,
  SmsTemplate,
  SmsTemplateCreate,
  SmsLog,
  SmsSendRequest,
  SmsEventType,
} from '@/types';

/**
 * Get SMS settings for current user
 */
export async function getSmsSettings(userId?: string, role?: string): Promise<SmsSettings[]> {
  const params = new URLSearchParams();
  if (userId) params.append('user_id', userId);
  if (role) params.append('role', role);
  
  const response = await api.get<SmsSettings[]>(`/api/sms/settings?${params.toString()}`);
  return response.data;
}

/**
 * Create or update SMS settings
 */
export async function updateSmsSettings(settings: SmsSettingsCreate): Promise<SmsSettings> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsApi.ts:31',message:'updateSmsSettings API call starting',data:{settings,hasToken:!!localStorage.getItem('token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  try {
    const response = await api.put<SmsSettings>('/api/sms/settings', settings);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsApi.ts:35',message:'updateSmsSettings API call succeeded',data:{status:response.status,data:response.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    return response.data;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'smsApi.ts:38',message:'updateSmsSettings API call failed',data:{errorMessage:error?.message,status:error?.response?.status,statusText:error?.response?.statusText,data:error?.response?.data,configUrl:error?.config?.url,hasAuthHeader:!!error?.config?.headers?.Authorization},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw error;
  }
}

/**
 * Get all SMS templates
 */
export async function getSmsTemplates(): Promise<SmsTemplate[]> {
  const response = await api.get<SmsTemplate[]>('/api/sms/templates');
  return response.data;
}

/**
 * Get SMS template by event type
 */
export async function getSmsTemplateByEvent(eventType: SmsEventType): Promise<SmsTemplate> {
  const response = await api.get<SmsTemplate>(`/api/sms/templates/${eventType}`);
  return response.data;
}

/**
 * Create SMS template (admin only)
 */
export async function createSmsTemplate(template: SmsTemplateCreate): Promise<SmsTemplate> {
  const response = await api.post<SmsTemplate>('/api/sms/templates', template);
  return response.data;
}

/**
 * Update SMS template (admin only)
 */
export async function updateSmsTemplate(
  templateId: string,
  template: Partial<SmsTemplateCreate>
): Promise<SmsTemplate> {
  const response = await api.put<SmsTemplate>(`/api/sms/templates/${templateId}`, template);
  return response.data;
}

/**
 * Get SMS logs
 */
export async function getSmsLogs(
  limit: number = 100,
  eventType?: SmsEventType,
  recipientPhone?: string
): Promise<SmsLog[]> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (eventType) params.append('event_type', eventType);
  if (recipientPhone) params.append('recipient_phone', recipientPhone);
  
  const response = await api.get<SmsLog[]>(`/api/sms/logs?${params.toString()}`);
  return response.data;
}

/**
 * Check mimsms.com account balance
 */
export async function getSmsBalance(): Promise<{ status: string; message?: string; balance?: number }> {
  const response = await api.get('/api/sms/balance');
  return response.data;
}

/**
 * Send test SMS
 */
export async function sendTestSms(request: SmsSendRequest): Promise<any> {
  const response = await api.post('/api/sms/test', request);
  return response.data;
}

/**
 * Send SMS immediately
 */
export async function sendSms(request: SmsSendRequest): Promise<any> {
  const response = await api.post('/api/sms/send', request);
  return response.data;
}

