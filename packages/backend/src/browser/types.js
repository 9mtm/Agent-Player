/**
 * Browser Automation Types
 * Web interaction and automation capabilities
 */
/** Default browser configuration */
export const DEFAULT_BROWSER_CONFIG = {
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
export const DEVICE_PRESETS = {
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
