export const getPhoneLocalDigits = (phone?: string | null) => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8')))
    return digits.slice(1);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
};

export const isValidRuPhone = (phone?: string | null) => {
  const digits = getPhoneLocalDigits(phone);
  return digits.length === 10 && digits.startsWith('9');
};

export const normalizeRuPhone = (phone?: string | null) => {
  const digits = getPhoneLocalDigits(phone);
  return digits ? `+7${digits}` : '';
};
