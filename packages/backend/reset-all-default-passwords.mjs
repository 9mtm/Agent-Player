/**
 * Disabled (S0-Q.2): this script used to reset accounts to passwords published in the
 * source code (admin123 / user123). Logins with those passwords are now refused.
 *
 * Set a real password instead:
 *   node reset-owner-password.mjs [email]
 */
console.error('This script is disabled. Use: node reset-owner-password.mjs [email]');
process.exit(1);
