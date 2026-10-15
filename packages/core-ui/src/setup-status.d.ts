export type SetupStatus = { setupComplete: boolean; setupRequired: boolean; message: 'Setup already completed' | 'Setup required' };
export function setupStatus(status: number, body: unknown): SetupStatus;
