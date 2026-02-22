/**
 * User Profile Step
 */

import * as prompts from '@clack/prompts';
import chalk from 'chalk';

export async function profileStep(): Promise<{
  name: string;
  language: 'en' | 'ar' | 'auto';
}> {
  prompts.log.step(chalk.cyan('📝 Step 1: User Profile'));

  const name = await prompts.text({
    message: 'What should we call you?',
    placeholder: 'John Doe',
    validate: (value) => {
      if (!value || value.length < 2) {
        return 'Please enter your name (at least 2 characters)';
      }
    }
  });

  if (prompts.isCancel(name)) {
    throw new Error('Cancelled');
  }

  const language = await prompts.select({
    message: 'Preferred language?',
    options: [
      { value: 'en', label: 'English', hint: 'Recommended' },
      { value: 'ar', label: 'العربية (Arabic)' },
      { value: 'auto', label: 'Auto-detect' }
    ],
    initialValue: 'en'
  });

  if (prompts.isCancel(language)) {
    throw new Error('Cancelled');
  }

  prompts.log.success(`Welcome, ${name}! 👋`);

  return {
    name: name as string,
    language: language as 'en' | 'ar' | 'auto'
  };
}
