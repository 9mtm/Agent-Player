import { defineCatalog, schema } from '@/lib/ui-web4/core';
import { z } from 'zod';

/**
 * Chat component catalog — defines which components AI agents can generate.
 * Uses Zod schemas to constrain AI output to valid props.
 */
export const chatCatalog = defineCatalog(schema, {
  components: {
    // ── Layout ────────────────────────────────────────────────────────────────
    Card: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
      }),
      description: 'A card container for grouping related information.',
      example: { title: 'Summary', description: null },
    },

    Stack: {
      props: z.object({
        gap: z.enum(['sm', 'md', 'lg']).nullable(),
        direction: z.enum(['vertical', 'horizontal']).nullable(),
      }),
      description: 'A layout container that stacks children vertically or horizontally.',
      example: { gap: 'md', direction: 'vertical' },
    },

    Grid: {
      props: z.object({
        columns: z.number().nullable(),
        gap: z.enum(['sm', 'md', 'lg']).nullable(),
      }),
      description: 'A grid layout for side-by-side items. columns=2 for two columns, columns=3 for three.',
      example: { columns: 2, gap: 'md' },
    },

    Separator: {
      props: z.object({}),
      description: 'A horizontal divider line.',
    },

    // ── Typography ────────────────────────────────────────────────────────────
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(['h1', 'h2', 'h3', 'h4']).nullable(),
      }),
      description: 'A section heading.',
      example: { text: 'Overview', level: 'h2' },
    },

    Text: {
      props: z.object({
        content: z.string(),
        muted: z.boolean().nullable(),
        size: z.enum(['sm', 'base', 'lg']).nullable(),
      }),
      description: 'Paragraph text. Set muted=true for secondary text.',
      example: { content: 'Here is the summary.', muted: null, size: null },
    },

    Link: {
      props: z.object({
        text: z.string(),
        href: z.string(),
      }),
      description: 'A clickable link that opens in a new tab.',
      example: { text: 'Open website', href: 'https://example.com' },
    },

    // ── Data Display ──────────────────────────────────────────────────────────
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.string(),
        detail: z.string().nullable(),
        trend: z.enum(['up', 'down', 'neutral']).nullable(),
      }),
      description: 'Display a key metric with label, value, and optional trend arrow.',
      example: { label: 'Temperature', value: '25°C', detail: 'Feels like 23°C', trend: 'up' },
    },

    Badge: {
      props: z.object({
        text: z.string(),
        variant: z.enum(['default', 'secondary', 'success', 'warning', 'destructive', 'outline']).nullable(),
      }),
      description: 'A small status badge/pill label.',
      example: { text: 'Active', variant: 'success' },
    },

    Table: {
      props: z.object({
        data: z.array(z.record(z.string(), z.unknown())),
        columns: z.array(z.object({ key: z.string(), label: z.string() })),
        emptyMessage: z.string().nullable(),
      }),
      description: 'A sortable data table. columns define which keys to show with labels.',
      example: {
        data: [{ name: 'Alice', score: 95 }],
        columns: [{ key: 'name', label: 'Name' }, { key: 'score', label: 'Score' }],
        emptyMessage: null,
      },
    },

    // ── Rich Content ─────────────────────────────────────────────────────────
    Callout: {
      props: z.object({
        type: z.enum(['info', 'tip', 'warning', 'important']).nullable(),
        title: z.string().nullable(),
        content: z.string(),
      }),
      description: 'A highlighted callout box for tips, warnings, or key information.',
      example: { type: 'tip', title: 'Did you know?', content: 'The sky is blue.' },
    },

    Timeline: {
      props: z.object({
        items: z.array(z.object({
          title: z.string(),
          description: z.string().nullable(),
          date: z.string().nullable(),
          status: z.enum(['completed', 'current', 'upcoming']).nullable(),
        })),
      }),
      description: 'A vertical timeline of events or steps.',
      example: {
        items: [
          { title: 'Start', description: 'Project kickoff', date: '2026-01-01', status: 'completed' },
          { title: 'Review', description: null, date: '2026-02-01', status: 'current' },
        ],
      },
    },

    Accordion: {
      props: z.object({
        items: z.array(z.object({
          title: z.string(),
          content: z.string(),
        })),
      }),
      description: 'A collapsible accordion for organizing detailed sections.',
      example: {
        items: [
          { title: 'What is this?', content: 'An accordion component.' },
        ],
      },
    },

    // ── Charts ────────────────────────────────────────────────────────────────
    BarChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(z.record(z.string(), z.unknown())),
        xKey: z.string(),
        yKey: z.string(),
        color: z.string().nullable(),
        height: z.number().nullable(),
      }),
      description: 'Bar chart. data is an array of objects; xKey is the category, yKey is the numeric value.',
      example: {
        title: 'Sales by Month',
        data: [{ month: 'Jan', sales: 120 }, { month: 'Feb', sales: 180 }],
        xKey: 'month',
        yKey: 'sales',
        color: null,
        height: null,
      },
    },

    LineChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(z.record(z.string(), z.unknown())),
        xKey: z.string(),
        yKey: z.string(),
        color: z.string().nullable(),
        height: z.number().nullable(),
      }),
      description: 'Line chart for trends over time. data is an array of objects; xKey is the x-axis, yKey is the numeric value.',
      example: {
        title: 'Temperature over Week',
        data: [{ day: 'Mon', temp: 22 }, { day: 'Tue', temp: 25 }],
        xKey: 'day',
        yKey: 'temp',
        color: null,
        height: null,
      },
    },

    PieChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(z.record(z.string(), z.unknown())),
        nameKey: z.string(),
        valueKey: z.string(),
        height: z.number().nullable(),
      }),
      description: 'Pie/donut chart for proportional data.',
      example: {
        title: 'Market Share',
        data: [{ company: 'A', share: 60 }, { company: 'B', share: 40 }],
        nameKey: 'company',
        valueKey: 'share',
        height: null,
      },
    },

    // ── Trading Charts ────────────────────────────────────────────────────────
    StockCandlestickChart: {
      props: z.object({
        symbol: z.string(),
        data: z.array(z.object({
          timestamp: z.string(),
          open: z.number(),
          high: z.number(),
          low: z.number(),
          close: z.number(),
          volume: z.number(),
        })),
        timeframe: z.enum(['1m', '5m', '15m', '1h', '1D', '1W', '1M']).nullable(),
        showVolume: z.boolean().nullable(),
        height: z.number().nullable(),
      }),
      description: 'Professional stock candlestick chart with OHLC data and volume bars. For trading applications.',
      example: {
        symbol: 'AAPL',
        data: [
          { timestamp: '2024-01-01', open: 150, high: 155, low: 148, close: 153, volume: 1000000 },
          { timestamp: '2024-01-02', open: 153, high: 158, low: 152, close: 156, volume: 1200000 },
        ],
        timeframe: '1D',
        showVolume: true,
        height: 500,
      },
    },

    OptionsChainTable: {
      props: z.object({
        symbol: z.string(),
        expirationDate: z.string(),
        chains: z.array(z.object({
          strike: z.number(),
          calls: z.object({
            bid: z.number(),
            ask: z.number(),
            volume: z.number(),
            iv: z.number(),
            delta: z.number(),
          }),
          puts: z.object({
            bid: z.number(),
            ask: z.number(),
            volume: z.number(),
            iv: z.number(),
            delta: z.number(),
          }),
        })),
        currentPrice: z.number().nullable(),
        highlightATM: z.boolean().nullable(),
        height: z.number().nullable(),
      }),
      description: 'Options chain table showing Calls and Puts with Greeks. For options trading.',
      example: {
        symbol: 'AAPL',
        expirationDate: '2024-03-15',
        currentPrice: 150,
        chains: [
          {
            strike: 150,
            calls: { bid: 5.20, ask: 5.30, volume: 1200, iv: 0.28, delta: 0.65 },
            puts: { bid: 2.10, ask: 2.15, volume: 800, iv: 0.26, delta: -0.35 },
          },
        ],
        highlightATM: true,
        height: 600,
      },
    },

    PortfolioPerformanceChart: {
      props: z.object({
        data: z.array(z.object({
          date: z.string(),
          portfolioValue: z.number(),
          benchmarkValue: z.number().nullable(),
        })),
        showBenchmark: z.boolean().nullable(),
        benchmarkName: z.string().nullable(),
        showDrawdown: z.boolean().nullable(),
        height: z.number().nullable(),
      }),
      description: 'Portfolio performance chart comparing portfolio value vs benchmark (e.g., S&P 500).',
      example: {
        data: [
          { date: '2024-01-01', portfolioValue: 10000, benchmarkValue: 10000 },
          { date: '2024-02-01', portfolioValue: 10500, benchmarkValue: 10200 },
          { date: '2024-03-01', portfolioValue: 11000, benchmarkValue: 10400 },
        ],
        showBenchmark: true,
        benchmarkName: 'S&P 500',
        showDrawdown: false,
        height: 400,
      },
    },

    AssetAllocationPie: {
      props: z.object({
        holdings: z.array(z.object({
          symbol: z.string(),
          name: z.string().nullable(),
          value: z.number(),
          percentage: z.number(),
        })),
        showPercentages: z.boolean().nullable(),
        interactive: z.boolean().nullable(),
        height: z.number().nullable(),
      }),
      description: 'Asset allocation pie chart showing portfolio distribution by stock/crypto.',
      example: {
        holdings: [
          { symbol: 'AAPL', name: 'Apple Inc.', value: 5000, percentage: 25 },
          { symbol: 'TSLA', name: 'Tesla Inc.', value: 3000, percentage: 15 },
          { symbol: 'MSFT', name: 'Microsoft', value: 4000, percentage: 20 },
          { symbol: 'BTC', name: 'Bitcoin', value: 8000, percentage: 40 },
        ],
        showPercentages: true,
        interactive: true,
        height: 400,
      },
    },

    // ── Interactive ───────────────────────────────────────────────────────────
    Tabs: {
      props: z.object({
        defaultValue: z.string().nullable(),
        tabs: z.array(z.object({ value: z.string(), label: z.string() })),
      }),
      slots: ['default'],
      description: 'Tabbed container. Use TabContent as children, one per tab.',
      example: { defaultValue: 'tab1', tabs: [{ value: 'tab1', label: 'Overview' }, { value: 'tab2', label: 'Details' }] },
    },

    TabContent: {
      props: z.object({ value: z.string() }),
      slots: ['default'],
      description: 'Content panel for a specific tab value.',
      example: { value: 'tab1' },
    },

    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(['default', 'secondary', 'outline', 'ghost', 'destructive']).nullable(),
        size: z.enum(['default', 'sm', 'lg']).nullable(),
      }),
      description: 'A clickable button.',
      example: { label: 'View Details', variant: 'outline', size: null },
    },

    // ── shadcn Extensions ─────────────────────────────────────────────────────
    ProgressBar: {
      props: z.object({
        label: z.string(),
        value: z.number(),
        max: z.number().nullable(),
        color: z.enum(['default', 'success', 'warning', 'destructive']).nullable(),
        showPercent: z.boolean().nullable(),
      }),
      description: 'A progress bar showing completion. value is 0-100 (or 0-max if max is set).',
      example: { label: 'Upload Progress', value: 65, max: null, color: 'success', showPercent: true },
    },

    Alert: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string(),
        variant: z.enum(['default', 'destructive']).nullable(),
      }),
      description: 'A simple alert box. Use variant=destructive for errors.',
      example: { title: 'Heads up!', description: 'Something needs your attention.', variant: 'default' },
    },

    UserCard: {
      props: z.object({
        name: z.string(),
        role: z.string().nullable(),
        email: z.string().nullable(),
        src: z.string().nullable(),
        size: z.enum(['sm', 'md', 'lg']).nullable(),
      }),
      description: 'A user avatar card with name, role, and optional email.',
      example: { name: 'Alice Smith', role: 'Engineer', email: 'alice@example.com', src: null, size: null },
    },

    SwitchRow: {
      props: z.object({
        label: z.string(),
        description: z.string().nullable(),
        checked: z.boolean(),
      }),
      description: 'A labeled toggle switch row. Use for on/off settings display.',
      example: { label: 'Dark Mode', description: 'Toggle dark theme', checked: false },
    },

    AreaChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(z.record(z.string(), z.unknown())),
        xKey: z.string(),
        yKey: z.string(),
        color: z.string().nullable(),
        height: z.number().nullable(),
        gradient: z.boolean().nullable(),
      }),
      description: 'Area chart with filled region under the line. Great for showing volume or cumulative trends.',
      example: {
        title: 'Daily Active Users',
        data: [{ day: 'Mon', users: 120 }, { day: 'Tue', users: 180 }],
        xKey: 'day',
        yKey: 'users',
        color: null,
        height: null,
        gradient: true,
      },
    },

    // ── Form Inputs ───────────────────────────────────────────────────────────
    InputField: {
      props: z.object({
        label: z.string(),
        placeholder: z.string().nullable(),
        value: z.string().nullable(),
        type: z.enum(['text', 'email', 'password', 'number', 'url']).nullable(),
        description: z.string().nullable(),
      }),
      description: 'A labeled text input field. Use for forms and data entry.',
      example: { label: 'Email', placeholder: 'you@example.com', value: null, type: 'email', description: null },
    },

    SelectField: {
      props: z.object({
        label: z.string(),
        options: z.array(z.object({ value: z.string(), label: z.string() })),
        value: z.string().nullable(),
        placeholder: z.string().nullable(),
        description: z.string().nullable(),
      }),
      description: 'A labeled dropdown select field.',
      example: {
        label: 'Country',
        options: [{ value: 'us', label: 'United States' }, { value: 'uk', label: 'United Kingdom' }],
        value: null,
        placeholder: 'Select a country',
        description: null,
      },
    },

    TextArea: {
      props: z.object({
        label: z.string(),
        placeholder: z.string().nullable(),
        value: z.string().nullable(),
        rows: z.number().nullable(),
        description: z.string().nullable(),
      }),
      description: 'A labeled multi-line text area for longer text input.',
      example: { label: 'Notes', placeholder: 'Write your notes here...', value: null, rows: 4, description: null },
    },

    CheckboxList: {
      props: z.object({
        items: z.array(z.object({
          id: z.string(),
          label: z.string(),
          checked: z.boolean(),
          disabled: z.boolean().nullable(),
        })),
      }),
      description: 'A list of labeled checkboxes. Good for task lists or feature lists.',
      example: {
        items: [
          { id: '1', label: 'Buy groceries', checked: true, disabled: null },
          { id: '2', label: 'Write tests', checked: false, disabled: null },
          { id: '3', label: 'Deploy to prod', checked: false, disabled: true },
        ],
      },
    },

    RadioGroup: {
      props: z.object({
        label: z.string().nullable(),
        options: z.array(z.object({ value: z.string(), label: z.string() })),
        value: z.string().nullable(),
        description: z.string().nullable(),
      }),
      description: 'Radio button group for single selection from a list of options.',
      example: {
        label: 'Choose plan',
        options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }, { value: 'enterprise', label: 'Enterprise' }],
        value: 'free',
        description: null,
      },
    },

    SliderRow: {
      props: z.object({
        label: z.string(),
        value: z.number(),
        min: z.number().nullable(),
        max: z.number().nullable(),
        step: z.number().nullable(),
        showValue: z.boolean().nullable(),
      }),
      description: 'An interactive slider with label. Great for settings like volume or opacity.',
      example: { label: 'Volume', value: 70, min: null, max: null, step: null, showValue: true },
    },

    SkeletonBlock: {
      props: z.object({
        lines: z.number().nullable(),
        type: z.enum(['text', 'card', 'avatar-row']).nullable(),
      }),
      description: 'Loading placeholder skeleton. Use to indicate content is loading.',
      example: { lines: 3, type: 'text' },
    },

    CalendarView: {
      props: z.object({
        title: z.string().nullable(),
        selectedDates: z.array(z.string()).nullable(),
      }),
      description: 'A monthly calendar. selectedDates is an array of ISO date strings (YYYY-MM-DD) to highlight.',
      example: { title: 'Schedule', selectedDates: ['2026-02-18', '2026-02-20'] },
    },

    // ── Installed extras ──────────────────────────────────────────────────────
    ToggleButton: {
      props: z.object({
        label: z.string(),
        pressed: z.boolean().nullable(),
        variant: z.enum(['default', 'outline']).nullable(),
        size: z.enum(['default', 'sm', 'lg']).nullable(),
      }),
      description: 'A stateful toggle button that shows pressed/unpressed state.',
      example: { label: 'Bold', pressed: true, variant: 'outline', size: null },
    },

    ToggleGroup: {
      props: z.object({
        label: z.string().nullable(),
        options: z.array(z.object({ value: z.string(), label: z.string() })),
        value: z.string().nullable(),
        variant: z.enum(['default', 'outline']).nullable(),
      }),
      description: 'A group of toggle buttons for single selection — like a segmented control.',
      example: {
        label: 'View',
        options: [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }],
        value: 'week',
        variant: 'outline',
      },
    },

    CollapsibleSection: {
      props: z.object({
        title: z.string(),
        defaultOpen: z.boolean().nullable(),
      }),
      slots: ['default'],
      description: 'An expandable/collapsible section with a clickable header. Children render inside.',
      example: { title: 'Advanced Options', defaultOpen: false },
    },

    ScrollBox: {
      props: z.object({
        maxHeight: z.number().nullable(),
      }),
      slots: ['default'],
      description: 'A scrollable container. maxHeight in pixels (default 300). Children render inside.',
      example: { maxHeight: 200 },
    },

    TooltipText: {
      props: z.object({
        text: z.string(),
        tooltip: z.string(),
        muted: z.boolean().nullable(),
      }),
      description: 'Text with an informational tooltip shown on hover.',
      example: { text: 'Latency', tooltip: 'Time from request to first byte', muted: null },
    },

    Breadcrumb: {
      props: z.object({
        items: z.array(z.object({
          label: z.string(),
          href: z.string().nullable(),
        })),
      }),
      description: 'A breadcrumb navigation trail. Last item is current page (no link).',
      example: {
        items: [
          { label: 'Home', href: '/' },
          { label: 'Projects', href: '/projects' },
          { label: 'Agent Player', href: null },
        ],
      },
    },

    PaginationBar: {
      props: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        showLabel: z.boolean().nullable(),
      }),
      description: 'A pagination display showing current and total pages.',
      example: { currentPage: 3, totalPages: 10, showLabel: true },
    },

    Carousel: {
      props: z.object({
        items: z.array(z.object({
          title: z.string().nullable(),
          description: z.string().nullable(),
          imageUrl: z.string().nullable(),
        })),
        autoPlay: z.boolean().nullable(),
      }),
      description: 'A horizontal carousel/slider for displaying multiple items.',
      example: {
        items: [
          { title: 'Slide 1', description: 'First slide', imageUrl: null },
          { title: 'Slide 2', description: 'Second slide', imageUrl: null },
        ],
        autoPlay: null,
      },
    },

    HoverCard: {
      props: z.object({
        triggerText: z.string(),
        title: z.string().nullable(),
        description: z.string(),
      }),
      description: 'A card that appears when hovering over trigger text — useful for previews.',
      example: { triggerText: '@alice', title: 'Alice Smith', description: 'Lead Engineer — alice@example.com' },
    },

    OTPDisplay: {
      props: z.object({
        length: z.number().nullable(),
        label: z.string().nullable(),
        placeholder: z.string().nullable(),
      }),
      description: 'An OTP / verification code input display with separated boxes.',
      example: { length: 6, label: 'Enter verification code', placeholder: null },
    },

    SidePanel: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        side: z.enum(['left', 'right', 'top', 'bottom']).nullable(),
      }),
      slots: ['default'],
      description: 'A labelled side panel / sheet container. Children render as the panel body.',
      example: { title: 'Details', description: 'View item details', side: 'right' },
    },

    DrawerCard: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      slots: ['default'],
      description: 'A styled drawer-style content card (rendered as a bottom sheet static display).',
      example: { title: 'Quick Actions', description: null },
    },

    AlertDialogCard: {
      props: z.object({
        title: z.string(),
        description: z.string(),
        confirmLabel: z.string().nullable(),
        cancelLabel: z.string().nullable(),
        variant: z.enum(['default', 'destructive']).nullable(),
      }),
      description: 'A confirmation dialog card with title, message, and action buttons. Use for destructive action warnings.',
      example: { title: 'Delete Project', description: 'This action cannot be undone. All data will be permanently removed.', confirmLabel: 'Delete', cancelLabel: 'Cancel', variant: 'destructive' },
    },

    DialogCard: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      slots: ['default'],
      description: 'A modal-style card with header and body. Use to show a preview of dialog content.',
      example: { title: 'Edit Profile', description: 'Update your personal information.' },
    },

    DropdownList: {
      props: z.object({
        label: z.string().nullable(),
        items: z.array(z.object({
          label: z.string(),
          shortcut: z.string().nullable(),
          disabled: z.boolean().nullable(),
          separator: z.boolean().nullable(),
        })),
      }),
      description: 'A static dropdown menu list showing available actions and keyboard shortcuts.',
      example: {
        label: 'File',
        items: [
          { label: 'New File', shortcut: 'Ctrl+N', disabled: null, separator: null },
          { label: 'Open', shortcut: 'Ctrl+O', disabled: null, separator: null },
          { label: 'Delete', shortcut: null, disabled: false, separator: true },
        ],
      },
    },

    CommandSearch: {
      props: z.object({
        placeholder: z.string().nullable(),
        groups: z.array(z.object({
          heading: z.string().nullable(),
          items: z.array(z.object({ label: z.string(), shortcut: z.string().nullable() })),
        })),
      }),
      description: 'A command palette showing searchable commands grouped by category.',
      example: {
        placeholder: 'Search commands...',
        groups: [
          {
            heading: 'Navigation',
            items: [{ label: 'Go to Dashboard', shortcut: 'G D' }, { label: 'Go to Settings', shortcut: 'G S' }],
          },
          {
            heading: 'Actions',
            items: [{ label: 'New Chat', shortcut: 'Ctrl+K' }, { label: 'Refresh', shortcut: null }],
          },
        ],
      },
    },

    ResizablePanel: {
      props: z.object({
        direction: z.enum(['horizontal', 'vertical']).nullable(),
        leftLabel: z.string().nullable(),
        rightLabel: z.string().nullable(),
        defaultSplit: z.number().nullable(),
      }),
      slots: ['default'],
      description: 'A two-panel resizable split layout. direction=horizontal is left/right; vertical is top/bottom.',
      example: { direction: 'horizontal', leftLabel: 'Editor', rightLabel: 'Preview', defaultSplit: 50 },
    },

    AspectBox: {
      props: z.object({
        ratio: z.number().nullable(),
        label: z.string().nullable(),
        bg: z.string().nullable(),
      }),
      slots: ['default'],
      description: 'A box constrained to a fixed aspect ratio. ratio=16/9=1.78, 4/3=1.33, 1=square.',
      example: { ratio: 1.78, label: '16:9 Video', bg: null },
    },

    // ── File Formats ──────────────────────────────────────────────────────────
    JsonViewer: {
      props: z.object({
        title: z.string().nullable(),
        data: z.unknown(),
        maxHeight: z.number().nullable(),
        defaultExpanded: z.boolean().nullable(),
      }),
      description: 'Renders a collapsible, syntax-colored JSON tree. data can be any JSON value (object, array, string, number, boolean, null).',
      example: {
        title: 'API Response',
        data: { status: 'ok', user: { id: 1, name: 'Alice' }, tags: ['admin', 'editor'] },
        maxHeight: null,
        defaultExpanded: true,
      },
    },

    MarkdownBlock: {
      props: z.object({
        content: z.string(),
        prose: z.boolean().nullable(),
      }),
      description: 'Renders a Markdown string as formatted HTML. Supports headings, bold, italic, lists, code blocks, links, and blockquotes.',
      example: {
        content: '## Hello\n\nThis is **bold** and *italic*.\n\n- Item one\n- Item two\n\n```js\nconsole.log("hello")\n```',
        prose: null,
      },
    },

    MDCBlock: {
      props: z.object({
        content: z.string(),
      }),
      description: 'Renders MDC (Markdown with Component directives). Lines starting with ::ComponentName{prop="value"} render that component inline; all other lines render as Markdown.',
      example: {
        content: '## Summary\n\nHere are the results:\n\n::Metric{label="Score" value="98%" trend="up"}\n\nAnd here is the status:\n\n::Badge{text="Active" variant="success"}',
      },
    },

    // ── Avatar ────────────────────────────────────────────────────────────────
    AvatarCard: {
      props: z.object({
        title: z.string().nullable(),
        size: z.enum(['sm', 'md', 'lg']).nullable(),
        removable: z.boolean().nullable(),
      }),
      description: 'Shows the interactive 3D avatar with microphone button. The avatar talks, animates, and responds to voice. Fetches the user stored avatar automatically.',
      example: { title: null, size: 'md', removable: true },
    },

    SupportChatBlock: {
      props: z.object({
        agentName: z.string().nullable(),
        height: z.number().nullable(),
        removable: z.boolean().nullable(),
        bgColor: z.string().nullable(),
      }),
      description: 'A compact chat support widget with a 3D animated avatar at the top, mic button, mute toggle, text input, and scrollable chat messages. bgColor sets the avatar area background (any CSS color).',
      example: { agentName: 'Assistant', height: 500, removable: true, bgColor: null },
    },

    AgentSupportPortal: {
      props: z.object({
        height: z.number().nullable(),
        bgColor: z.string().nullable(),
        title: z.string().nullable(),
      }),
      description: 'Agent selection portal — shows a grid of all configured agents (name, emoji, role). User picks one and enters a full SupportChatBlock chat with that agent.',
      example: { height: 560, bgColor: null, title: 'Choose your assistant' },
    },

    // ── Weather ───────────────────────────────────────────────────────────────
    WeatherCard: {
      props: z.object({
        location: z.string(),
        condition: z.enum(['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'snowy', 'stormy', 'windy']),
        temperature: z.number(),
        unit: z.enum(['C', 'F']).nullable(),
        humidity: z.number().nullable(),
        wind: z.number().nullable(),
        feelsLike: z.number().nullable(),
        size: z.enum(['sm', 'md', 'lg']).nullable(),
        forecast: z.array(z.object({
          day: z.string(),
          condition: z.enum(['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'snowy', 'stormy', 'windy']),
          high: z.number(),
          low: z.number(),
        })).nullable(),
      }),
      description: 'A weather card showing current conditions with icons. size=sm is compact (icon+temp+city), md adds humidity/wind details, lg adds a multi-day forecast strip. Always uses icons, never emojis.',
      example: {
        location: 'Dubai',
        condition: 'sunny',
        temperature: 38,
        unit: 'C',
        humidity: 45,
        wind: 18,
        feelsLike: 41,
        size: 'md',
        forecast: null,
      },
    },
  },
  actions: {},
});
