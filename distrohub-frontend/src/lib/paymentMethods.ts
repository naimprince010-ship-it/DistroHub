export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_banking', label: 'Mobile Banking (bKash/Nagad)' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHOD_OPTIONS)[number]['value'];

export const formatPaymentMethodLabel = (value?: string | null): string => {
  if (!value) return 'Unknown';
  const normalized = value.trim().toLowerCase();
  const option = PAYMENT_METHOD_OPTIONS.find((item) => item.value === normalized);
  if (option) return option.label;

  if (normalized === 'bank') return 'Bank Transfer';
  if (normalized === 'mobile') return 'Mobile Banking (bKash/Nagad)';
  return value;
};
