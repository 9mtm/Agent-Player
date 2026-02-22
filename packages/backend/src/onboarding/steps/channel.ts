/**
 * Channel Step
 */

import * as prompts from '@clack/prompts';
import chalk from 'chalk';

export async function channelStep(): Promise<{
  selected: string[];
  connected: string[];
}> {
  prompts.log.step(chalk.cyan('📱 Step 3: Messaging Channel'));

  const channel = await prompts.select({
    message: 'Where do you want to use your agent?',
    options: [
      {
        value: 'whatsapp',
        label: 'WhatsApp',
        hint: 'Most popular 📱'
      },
      {
        value: 'telegram',
        label: 'Telegram',
        hint: 'Easy setup 💬'
      },
      {
        value: 'web',
        label: 'Web only',
        hint: 'No installation 🌐'
      },
      {
        value: 'skip',
        label: 'Skip for now',
        hint: 'Set up later ⏭️'
      }
    ],
    initialValue: 'whatsapp'
  });

  if (prompts.isCancel(channel)) {
    throw new Error('Cancelled');
  }

  if (channel === 'skip') {
    prompts.log.info('You can add channels later in settings');
    return { selected: [], connected: [] };
  }

  if (channel === 'web') {
    prompts.log.success('Web interface will be available at http://localhost:3000');
    return { selected: ['web'], connected: ['web'] };
  }

  // Show connection instructions
  if (channel === 'whatsapp') {
    await setupWhatsApp();
  } else if (channel === 'telegram') {
    await setupTelegram();
  }

  return {
    selected: [channel as string],
    connected: [] // Will be connected when backend starts
  };
}

async function setupWhatsApp(): Promise<void> {
  prompts.log.info('\n📱 Setting up WhatsApp...\n');

  console.log(chalk.gray(`1. Open WhatsApp on your phone
2. Tap Menu → Linked Devices
3. Scan the QR code when backend starts

`));

  prompts.log.success('WhatsApp will connect when you start the backend');
}

async function setupTelegram(): Promise<void> {
  prompts.log.info('\n💬 Setting up Telegram...\n');

  console.log(chalk.gray(`1. Search for @BotFather on Telegram
2. Send /newbot and follow instructions
3. Copy the bot token
4. Add it to your settings

`));

  prompts.log.success('Telegram will connect when you configure the token');
}
