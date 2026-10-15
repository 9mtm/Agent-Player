// Exact public discovery contract shared by the browser and narrow bridge.
// A setup flag or owner/admin existence is advisory, never authentication.
export function setupStatus(status, body) {
  if (status !== 200 || body === null || typeof body !== 'object' || Array.isArray(body)
    || Object.keys(body).length !== 3
    || !['setupComplete', 'setupRequired', 'message'].every(k => Object.prototype.hasOwnProperty.call(body, k))
    || typeof body.setupComplete !== 'boolean' || body.setupRequired !== !body.setupComplete
    || body.message !== (body.setupComplete ? 'Setup already completed' : 'Setup required')) throw new Error('Setup discovery unavailable');
  return { setupComplete: body.setupComplete, setupRequired: !body.setupComplete,
    message: body.setupComplete ? 'Setup already completed' : 'Setup required' };
}
