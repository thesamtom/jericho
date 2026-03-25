const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-').map((part) => Number(part));
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const input = hasTimezone ? normalized : `${normalized}Z`;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function formatDateDisplay(value) {
  const date = toDate(value);
  if (!date) return '—';
  const day = pad2(date.getDate());
  const month = MONTHS[date.getMonth()] || '';
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatTimeDisplay(value) {
  const date = toDate(value);
  if (!date) return '—';

  const hours24 = date.getHours();
  const minutes = pad2(date.getMinutes());
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;

  return `${pad2(hours12)}:${minutes} ${ampm}`;
}

export function formatTimeString(timeStr) {
  if (!timeStr) return '—';
  const trimmed = String(timeStr).trim();
  if (!trimmed) return '—';
  
  // Handle HH:MM format
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '—';
  
  let hours24 = parseInt(match[1], 10);
  const minutes = pad2(match[2]);
  
  if (hours24 < 0 || hours24 > 23) return '—';
  
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  
  return `${pad2(hours12)}:${minutes} ${ampm}`;
}

export function formatDateTimeDisplay(value) {
  const date = toDate(value);
  if (!date) return '—';
  return `${formatDateDisplay(date)} ${formatTimeDisplay(date)}`;
}

export function formatDateRangeDisplay(fromValue, toValue, fromTime = null, toTime = null) {
  const fromDate = formatDateDisplay(fromValue);
  const toDate = formatDateDisplay(toValue);
  
  // If dates are same and times are provided, show times
  if (fromDate === toDate && fromTime && toTime) {
    const fromTimeStr = formatTimeString(fromTime);
    const toTimeStr = formatTimeString(toTime);
    return `${fromDate} (${fromTimeStr} — ${toTimeStr})`;
  }
  
  return `${fromDate} — ${toDate}`;
}
