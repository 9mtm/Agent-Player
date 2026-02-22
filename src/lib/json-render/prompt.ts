/**
 * Concise ui-web4 prompt for frontend use (e.g. daily report page system prompt).
 * Keep in sync with backend json-render-prompt.ts
 */
export function getJsonRenderPrompt(): string {
  return `## Rich UI Components

When showing data, stats, charts, comparisons — output a \`\`\`spec block AFTER your text.

FORMAT (JSON Patch lines):
\`\`\`spec
{"op":"add","path":"/root","value":"ROOT_ID"}
{"op":"add","path":"/elements/ROOT_ID","value":{"type":"COMPONENT","props":{...},"children":["CHILD_ID"]}}
{"op":"add","path":"/elements/CHILD_ID","value":{"type":"COMPONENT","props":{...},"children":[]}}
\`\`\`

COMPONENTS: Card, Stack, Grid, Heading, Text, Metric, Badge, Table, Callout, Timeline, Accordion, BarChart, LineChart, PieChart, Tabs+TabContent, Button, Link

EXAMPLE:
\`\`\`spec
{"op":"add","path":"/root","value":"g"}
{"op":"add","path":"/elements/g","value":{"type":"Grid","props":{"columns":2,"gap":"md"},"children":["c1","c2"]}}
{"op":"add","path":"/elements/c1","value":{"type":"Card","props":{"title":"Tokyo","description":null},"children":["m1"]}}
{"op":"add","path":"/elements/m1","value":{"type":"Metric","props":{"label":"Temp","value":"24°C","detail":null,"trend":"up"},"children":[]}}
{"op":"add","path":"/elements/c2","value":{"type":"Card","props":{"title":"London","description":null},"children":["m2"]}}
{"op":"add","path":"/elements/m2","value":{"type":"Metric","props":{"label":"Temp","value":"12°C","detail":null,"trend":"down"},"children":[]}}
\`\`\``;
}
