/** The emitted device token shape; possession never establishes authentication. */
export const validDeviceToken = value => typeof value === 'string' && value.length === 43 && /^[A-Za-z0-9_-]{43}$/.test(value);
export function validLoginBody(body) {
  return body !== null && typeof body === 'object' && !Array.isArray(body)
    && Object.keys(body).every(key => ['email', 'password', 'deviceToken'].includes(key))
    && Object.hasOwn(body, 'email') && Object.hasOwn(body, 'password')
    && typeof body.email === 'string' && body.email.length > 0 && body.email.length <= 320
    && typeof body.password === 'string' && body.password.length > 0 && body.password.length <= 4096
    && (!Object.hasOwn(body, 'deviceToken') || validDeviceToken(body.deviceToken));
}
