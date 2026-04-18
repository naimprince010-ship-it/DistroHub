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
  const response = await api.put<SmsSettings>('/api/sms/settings', settings);
  return response.data;
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

