/** Normalize the existing chat endpoint's JSON and SSE responses into plain text. */
export function extractAgentReply(response) {
  if (response.statusCode >= 400) throw new Error('Agent request failed');
  if (String(response.headers['content-type']).includes('text/event-stream')) {
    let text = '';
    let done = false;
    for (const line of response.body.split(/\r?\n/)) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6);
      if (payload === '[DONE]') { done = true; continue; }
      const event = JSON.parse(payload);
      if (event.type === 'error') throw new Error('Agent request failed');
      if (event.type === 'text' && typeof event.content === 'string') text += event.content;
      if (event.type === 'done') done = true;
    }
    if (!done || !text.trim()) throw new Error('Agent did not finish a text response');
    return text;
  }
  const result = JSON.parse(response.body);
  const text = result.message?.content || result.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('Agent did not return text');
  return text;
}
