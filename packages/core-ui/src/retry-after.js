// Advisory delay only. Never schedules or authorizes a retry.
export function retryAfterSeconds(value) {
  if (typeof value === 'string' && /^[1-9][0-9]{0,3}$/.test(value)) value = Number(value);
  return Number.isInteger(value) && value >= 1 && value <= 3600 ? value : undefined;
}
export function retryAfterNotice(value) {
  const seconds = retryAfterSeconds(value);
  return seconds === undefined ? '' : ` Try again in ${seconds} s. No automatic retry was sent.`;
}
