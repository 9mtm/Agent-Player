/**
 * Tool Extension Template
 * Simple extension that registers AI tools only
 */

export default async function initialize(api) {
  console.log('[My Tool] ✅ Extension loaded');

  /**
   * Example Tool 1: Text Processing
   */
  api.registerTool({
    name: 'my_tool_process_text',
    description: 'Process text with a custom algorithm',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to process' },
        mode: {
          type: 'string',
          enum: ['uppercase', 'lowercase', 'reverse'],
          description: 'Processing mode',
        },
      },
      required: ['text', 'mode'],
    },
    execute: async (input) => {
      let result;

      switch (input.mode) {
        case 'uppercase':
          result = input.text.toUpperCase();
          break;
        case 'lowercase':
          result = input.text.toLowerCase();
          break;
        case 'reverse':
          result = input.text.split('').reverse().join('');
          break;
        default:
          throw new Error(`Unknown mode: ${input.mode}`);
      }

      return {
        success: true,
        result,
        original: input.text,
        mode: input.mode,
      };
    },
  });

  /**
   * Example Tool 2: Data Analysis
   */
  api.registerTool({
    name: 'my_tool_analyze_numbers',
    description: 'Analyze a list of numbers and return statistics',
    inputSchema: {
      type: 'object',
      properties: {
        numbers: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of numbers to analyze',
        },
      },
      required: ['numbers'],
    },
    execute: async (input) => {
      const numbers = input.numbers;

      if (numbers.length === 0) {
        return { error: 'Empty array' };
      }

      const sum = numbers.reduce((a, b) => a + b, 0);
      const avg = sum / numbers.length;
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);

      const sorted = [...numbers].sort((a, b) => a - b);
      const median =
        numbers.length % 2 === 0
          ? (sorted[numbers.length / 2 - 1] + sorted[numbers.length / 2]) / 2
          : sorted[Math.floor(numbers.length / 2)];

      return {
        success: true,
        count: numbers.length,
        sum,
        average: avg,
        min,
        max,
        median,
      };
    },
  });

  /**
   * Example Tool 3: External API Call (requires 'network' permission)
   */
  // api.registerTool({
  //   name: 'my_tool_fetch_data',
  //   description: 'Fetch data from an external API',
  //   inputSchema: {
  //     type: 'object',
  //     properties: {
  //       url: { type: 'string', description: 'API URL to fetch' }
  //     },
  //     required: ['url']
  //   },
  //   execute: async (input) => {
  //     const response = await fetch(input.url);
  //     const data = await response.json();
  //
  //     return {
  //       success: true,
  //       data,
  //       status: response.status
  //     };
  //   }
  // });
}
