export const IST_TIMEZONE = 'Asia/Kolkata';

export const formatDateTimeIST = (dateText, options = {}) => {
  if (!dateText) return '-';
  return new Date(dateText).toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
};

export const formatDateIST = (dateText, options = {}) => {
  if (!dateText) return '-';
  return new Date(dateText).toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

export const formatTimeIST = (dateText, options = {}) => {
  if (!dateText) return '-';
  return new Date(dateText).toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
};

export const getDateKeyIST = (dateText) => {
  if (!dateText) return '';
  return formatDateIST(dateText, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getRelativeDateKeyIST = (offsetDays = 0) => {
  const target = new Date(Date.now() + (offsetDays * 24 * 60 * 60 * 1000));
  return getDateKeyIST(target.toISOString());
};

export const getCurrentHourIST = () => {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const hourText = parts.find((part) => part.type === 'hour')?.value || '0';
  return Number(hourText);
};

export const getGreetingIST = (roleLabel = 'Farmer') => {
  const hour = getCurrentHourIST();
  if (hour < 12) return `Good Morning, ${roleLabel}!`;
  if (hour < 17) return `Good Afternoon, ${roleLabel}!`;
  return `Good Evening, ${roleLabel}!`;
};
