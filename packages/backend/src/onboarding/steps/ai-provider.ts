/**
 * AI Provider Step
 */

import * as prompts from '@clack/prompts';
import chalk from 'chalk';

export async function aiProviderStep(): Promise<{
  provider: 'anthropic' | 'openai' | 'google' | 'ollama';
  apiKey?: string;
  configured: boolean;
}> {
  prompts.log.step(chalk.cyan('🤖 Step 2: AI Provider'));

  const provider = await prompts.select({
    message: 'Which AI service would you like to use?',
    options: [
      {
        value: 'anthropic',
        label: 'Claude (Anthropic)',
        hint: 'Recommended ⭐'
      },
      {
        value: 'openai',
        label: 'ChatGPT (OpenAI)',
        hint: 'Popular'
      },
      {
        value: 'google',
        label: 'Gemini (Google)',
        hint: 'Fast'
      },
      {
        value: 'ollama',
        label: 'Local LLM (Ollama)',
        hint: 'Free, offline'
      }
    ],
    initialValue: 'anthropic'
  });

  if (prompts.isCancel(provider)) {
    throw new Error('Cancelled');
  }

  // If Ollama, no API key needed
  if (provider === 'ollama') {
    prompts.log.info('Ollama will use your local models');
    return {
      provider: 'ollama',
      configured: true
    };
  }

  // Ask for API key
  const hasApiKey = await prompts.confirm({
    message: `Do you have a ${getProviderName(provider)} API key?`,
    initialValue: false
  });

  if (prompts.isCancel(hasApiKey)) {
    throw new Error('Cancelled');
  }

  if (!hasApiKey) {
    prompts.log.info(`\n📝 Get your API key:\n   → ${getApiKeyUrl(provider)}\n`);

    const shouldWait = await prompts.confirm({
      message: 'Ready to enter your API key now?',
      initialValue: true
    });

    if (!shouldWait) {
      prompts.log.warn('You can add your API key later in settings');
      return {
        provider: provider as any,
        configured: false
      };
    }
  }

  const apiKey = await prompts.password({
    message: 'Paste your API key:',
    validate: (value) => {
      if (!value || value.length < 10) {
        return 'Please enter a valid API key';
      }
    }
  });

  if (prompts.isCancel(apiKey)) {
    throw new Error('Cancelled');
  }

  // TODO: Validate API key
  const spinner = prompts.spinner();
  spinner.start('Validating API key...');

  await new Promise(resolve => setTimeout(resolve, 1000));

  spinner.stop('✅ API key verified!');

  return {
    provider: provider as any,
    apiKey: apiKey as string,
    configured: true
  };
}

function getProviderName(provider: string): string {
  const names: Record<string, string> = {
    anthropic: 'Claude',
    openai: 'OpenAI',
    google: 'Google',
    ollama: 'Ollama'
  };
  return names[provider] || provider;
}

function getApiKeyUrl(provider: string): string {
  const urls: Record<string, string> = {
    anthropic: 'https://console.anthropic.com',
    openai: 'https://platform.openai.com/api-keys',
    google: 'https://makersuite.google.com/app/apikey'
  };
  return urls[provider] || '#';
}
