export function extractAgentReply(response: {
  statusCode: number;
  headers: Record<string, unknown>;
  body: string;
}): string;
