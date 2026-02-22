/**
 * Browser Automation Types
 * Web interaction and automation capabilities
 */

/** Browser instance status */
export type BrowserStatus = 'idle' | 'navigating' | 'interacting' | 'waiting' | 'error' | 'closed';

/** Page load state */
export type PageLoadState = 'loading' | 'interactive' | 'complete';

/** Element selector type */
export type SelectorType = 'css' | 'xpath' | 'text' | 'aria' | 'testid';

/** Mouse button */
export type MouseButton = 'left' | 'right' | 'middle';

/** Keyboard modifier */
export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta';

/** Screenshot format */
export type ScreenshotFormat = 'png' | 'jpeg' | 'webp';

/** Browser configuration */
export interface BrowserConfig {
  /** Headless mode */
  headless: boolean;
  /** Browser viewport width */
  viewportWidth: number;
  /** Browser viewport height */
  viewportHeight: number;
  /** User agent string */
  userAgent?: string;
  /** Default timeout (ms) */
  timeout: number;
  /** Navigation timeout (ms) */
  navigationTimeout: number;
  /** Enable JavaScript */
  javascript: boolean;
  /** Accept cookies */
  acceptCookies: boolean;
  /** Ignore HTTPS errors */
  ignoreHttpsErrors: boolean;
  /** Proxy settings */
  proxy?: ProxyConfig;
  /** Download directory */
  downloadPath?: string;
  /** Extra HTTP headers */
  extraHeaders?: Record<string, string>;
  /** Device emulation */
  device?: DeviceEmulation;
}

/** Proxy configuration */
export interface ProxyConfig {
  /** Proxy server URL */
  server: string;
  /** Proxy username */
  username?: string;
  /** Proxy password */
  password?: string;
  /** Bypass list */
  bypass?: string[];
}

/** Device emulation settings */
export interface DeviceEmulation {
  /** Device name */
  name: string;
  /** Screen width */
  width: number;
  /** Screen height */
  height: number;
  /** Device scale factor */
  deviceScaleFactor: number;
  /** Is mobile device */
  isMobile: boolean;
  /** Has touch capability */
  hasTouch: boolean;
  /** User agent override */
  userAgent?: string;
}

/** Browser session */
export interface BrowserSession {
  /** Session ID */
  id: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last activity */
  lastActivity: Date;
  /** Current status */
  status: BrowserStatus;
  /** Current URL */
  currentUrl?: string;
  /** Page title */
  pageTitle?: string;
  /** Browser configuration */
  config: BrowserConfig;
  /** Active page count */
  pageCount: number;
  /** Cookies count */
  cookiesCount: number;
  /** Error if any */
  error?: string;
}

/** Element info */
export interface ElementInfo {
  /** Element tag name */
  tagName: string;
  /** Element ID */
  id?: string;
  /** Element classes */
  classes: string[];
  /** Element text content */
  textContent?: string;
  /** Inner HTML (truncated) */
  innerHTML?: string;
  /** Element attributes */
  attributes: Record<string, string>;
  /** Bounding box */
  boundingBox?: BoundingBox;
  /** Is visible */
  isVisible: boolean;
  /** Is enabled */
  isEnabled: boolean;
  /** Is editable */
  isEditable: boolean;
  /** Is checked (for checkboxes) */
  isChecked?: boolean;
  /** Selected option (for selects) */
  selectedOption?: string;
}

/** Bounding box */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Navigation options */
export interface NavigationOptions {
  /** Wait until state */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  /** Timeout override */
  timeout?: number;
  /** Referer header */
  referer?: string;
}

/** Click options */
export interface ClickOptions {
  /** Mouse button */
  button?: MouseButton;
  /** Click count (1=click, 2=dblclick) */
  clickCount?: number;
  /** Delay between mousedown and mouseup */
  delay?: number;
  /** Position within element */
  position?: { x: number; y: number };
  /** Key modifiers */
  modifiers?: KeyModifier[];
  /** Force click even if element is covered */
  force?: boolean;
  /** Timeout override */
  timeout?: number;
}

/** Type options */
export interface TypeOptions {
  /** Delay between keystrokes */
  delay?: number;
  /** Clear existing text first */
  clear?: boolean;
  /** Timeout override */
  timeout?: number;
}

/** Select options */
export interface SelectOptions {
  /** Select by value */
  value?: string | string[];
  /** Select by label */
  label?: string | string[];
  /** Select by index */
  index?: number | number[];
  /** Timeout override */
  timeout?: number;
}

/** Wait options */
export interface WaitOptions {
  /** Timeout override */
  timeout?: number;
  /** Polling interval */
  polling?: number;
  /** Wait for visibility */
  visible?: boolean;
  /** Wait for hidden */
  hidden?: boolean;
  /** Wait for enabled */
  enabled?: boolean;
}

/** Screenshot options */
export interface ScreenshotOptions {
  /** Output format */
  format?: ScreenshotFormat;
  /** Quality (jpeg/webp only, 0-100) */
  quality?: number;
  /** Full page screenshot */
  fullPage?: boolean;
  /** Clip region */
  clip?: BoundingBox;
  /** Omit background */
  omitBackground?: boolean;
}

/** PDF options */
export interface PdfOptions {
  /** Page format */
  format?: 'letter' | 'legal' | 'tabloid' | 'a4' | 'a3';
  /** Landscape orientation */
  landscape?: boolean;
  /** Scale (0.1 - 2.0) */
  scale?: number;
  /** Print background graphics */
  printBackground?: boolean;
  /** Margins */
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  /** Header template HTML */
  headerTemplate?: string;
  /** Footer template HTML */
  footerTemplate?: string;
}

/** Script injection result */
export interface ScriptResult {
  /** Success status */
  success: boolean;
  /** Return value */
  value?: unknown;
  /** Error if failed */
  error?: string;
  /** Execution duration (ms) */
  duration: number;
}

/** Network request info */
export interface NetworkRequest {
  /** Request ID */
  id: string;
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers: Record<string, string>;
  /** POST data */
  postData?: string;
  /** Resource type */
  resourceType: string;
  /** Timestamp */
  timestamp: Date;
}

/** Network response info */
export interface NetworkResponse {
  /** Request ID */
  requestId: string;
  /** Response URL */
  url: string;
  /** Status code */
  status: number;
  /** Status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Content type */
  contentType?: string;
  /** Body size (bytes) */
  bodySize: number;
  /** Response time (ms) */
  responseTime: number;
  /** Timestamp */
  timestamp: Date;
}

/** Console message */
export interface ConsoleMessage {
  /** Message type */
  type: 'log' | 'debug' | 'info' | 'error' | 'warning' | 'dir' | 'table' | 'trace';
  /** Message text */
  text: string;
  /** Location */
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  /** Timestamp */
  timestamp: Date;
}

/** Page metrics */
export interface PageMetrics {
  /** DOM content loaded time (ms) */
  domContentLoaded: number;
  /** Full load time (ms) */
  loadTime: number;
  /** First contentful paint (ms) */
  firstContentfulPaint?: number;
  /** Largest contentful paint (ms) */
  largestContentfulPaint?: number;
  /** DOM node count */
  domNodes: number;
  /** JS heap size (bytes) */
  jsHeapUsed: number;
  /** Layout count */
  layoutCount: number;
  /** Script execution time (ms) */
  scriptDuration: number;
  /** Resource count */
  resourceCount: number;
  /** Total bytes transferred */
  bytesTransferred: number;
}

/** Browser action for recording */
export interface BrowserAction {
  /** Action ID */
  id: string;
  /** Action type */
  type: 'navigate' | 'click' | 'type' | 'select' | 'scroll' | 'wait' | 'screenshot' | 'script';
  /** Target selector */
  selector?: string;
  /** Selector type */
  selectorType?: SelectorType;
  /** Action value/data */
  value?: string;
  /** Action options */
  options?: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
  /** Duration (ms) */
  duration?: number;
  /** Success status */
  success: boolean;
  /** Error if failed */
  error?: string;
  /** Screenshot after action */
  screenshotPath?: string;
}

/** Browser automation stats */
export interface BrowserStats {
  /** Active sessions */
  activeSessions: number;
  /** Total sessions created */
  totalSessions: number;
  /** Total pages navigated */
  totalNavigations: number;
  /** Total actions performed */
  totalActions: number;
  /** Failed actions */
  failedActions: number;
  /** Total screenshots */
  totalScreenshots: number;
  /** Uptime (ms) */
  uptime: number;
}

/** Default browser configuration */
export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  headless: true,
  viewportWidth: 1280,
  viewportHeight: 720,
  timeout: 30000,
  navigationTimeout: 60000,
  javascript: true,
  acceptCookies: true,
  ignoreHttpsErrors: false,
};

/** Common device emulations */
export const DEVICE_PRESETS: Record<string, DeviceEmulation> = {
  'iPhone 14': {
    name: 'iPhone 14',
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  },
  'iPad Pro': {
    name: 'iPad Pro',
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  },
  'Pixel 7': {
    name: 'Pixel 7',
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  },
  'Desktop HD': {
    name: 'Desktop HD',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  'Desktop 4K': {
    name: 'Desktop 4K',
    width: 3840,
    height: 2160,
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  },
};
