/**
 * Formatting Utilities
 *
 * Helper functions for beautiful CLI output
 */

import chalk from 'chalk';
import Table from 'cli-table3';

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(chalk.green(`✅ ${message}`));
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.error(chalk.red(`❌ ${message}`));
}

/**
 * Print warning message
 */
export function warning(message: string): void {
  console.warn(chalk.yellow(`⚠️  ${message}`));
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(chalk.blue(`ℹ️  ${message}`));
}

/**
 * Print section header
 */
export function header(text: string): void {
  console.log(chalk.bold.cyan(`\n${text}`));
  console.log(chalk.gray('─'.repeat(text.length)));
}

/**
 * Create a table
 */
export function createTable(headers: string[]): Table.Table {
  return new Table({
    head: headers.map(h => chalk.bold.cyan(h)),
    style: {
      head: [],
      border: ['gray']
    }
  });
}

/**
 * Format a date nicely
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  // Less than 1 minute
  if (diff < 60000) {
    return chalk.green('just now');
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return chalk.green(`${minutes}m ago`);
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return chalk.yellow(`${hours}h ago`);
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return chalk.yellow(`${days}d ago`);
  }

  // Older
  return chalk.gray(d.toLocaleDateString());
}

/**
 * Format file size
 */
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Print a box around text
 */
export function box(text: string): void {
  const lines = text.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length));
  const border = '─'.repeat(maxLength + 2);

  console.log(chalk.cyan(`╔${border}╗`));
  lines.forEach(line => {
    const padding = ' '.repeat(maxLength - line.length);
    console.log(chalk.cyan(`║ ${line}${padding} ║`));
  });
  console.log(chalk.cyan(`╚${border}╝`));
}
