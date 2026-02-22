/**
 * Skills Step
 */

import * as prompts from '@clack/prompts';
import chalk from 'chalk';

export async function skillsStep(): Promise<{
  installed: string[];
}> {
  prompts.log.step(chalk.cyan('🛠️ Step 4: Skills'));

  const skills = await prompts.multiselect({
    message: 'What would you like your agent to do?',
    options: [
      {
        value: 'weather',
        label: 'Check weather forecasts',
        hint: '🌤️'
      },
      {
        value: 'web-search',
        label: 'Search the web',
        hint: '🔍'
      },
      {
        value: 'note-taking',
        label: 'Take notes',
        hint: '📝'
      },
      {
        value: 'github',
        label: 'Manage GitHub repos',
        hint: '🐙'
      },
      {
        value: 'calculator',
        label: 'Perform calculations',
        hint: '🔢'
      }
    ],
    initialValues: ['weather', 'web-search', 'note-taking'],
    required: false
  });

  if (prompts.isCancel(skills)) {
    throw new Error('Cancelled');
  }

  const selectedSkills = skills as string[];

  if (selectedSkills.length === 0) {
    prompts.log.info('No skills selected. You can add them later!');
    return { installed: [] };
  }

  // Simulate installation
  const spinner = prompts.spinner();
  spinner.start('Installing skills...');

  await new Promise(resolve => setTimeout(resolve, 1500));

  spinner.stop(`✅ Installed ${selectedSkills.length} skill(s)`);

  selectedSkills.forEach(skill => {
    console.log(chalk.gray(`  ✓ ${skill}`));
  });

  console.log();

  return { installed: selectedSkills };
}
