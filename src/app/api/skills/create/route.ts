import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), 'skills');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, config, instructions, includeScripts, includeReferences, includeAssets } = body;

    // Support both old format (content) and new format (config + instructions)
    const skillConfig = config || null;
    const skillInstructions = instructions || body.content || '';

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate skill name
    const normalizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!normalizedName) {
      return NextResponse.json(
        { error: 'Invalid skill name' },
        { status: 400 }
      );
    }

    // Create skills directory if it doesn't exist
    if (!fs.existsSync(SKILLS_DIR)) {
      fs.mkdirSync(SKILLS_DIR, { recursive: true });
    }

    // Create skill directory
    const skillDir = path.join(SKILLS_DIR, normalizedName);

    if (fs.existsSync(skillDir)) {
      return NextResponse.json(
        { error: `Skill "${normalizedName}" already exists` },
        { status: 409 }
      );
    }

    fs.mkdirSync(skillDir, { recursive: true });

    // Create skill.json (new format)
    if (skillConfig) {
      const skillJsonPath = path.join(skillDir, 'skill.json');
      fs.writeFileSync(
        skillJsonPath,
        JSON.stringify(skillConfig, null, 2),
        'utf-8'
      );
    }

    // Create SKILL.md
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillMdPath, skillInstructions, 'utf-8');

    // Create optional directories
    if (includeScripts) {
      const scriptsDir = path.join(skillDir, 'scripts');
      fs.mkdirSync(scriptsDir, { recursive: true });

      // Create example script
      const exampleScript = `#!/usr/bin/env python3
"""
Example script for ${normalizedName}

Usage:
    python3 scripts/example.py [args]
"""

def main():
    print("${normalizedName} script executed!")
    # TODO: Add your script logic here

if __name__ == "__main__":
    main()
`;
      fs.writeFileSync(path.join(scriptsDir, 'example.py'), exampleScript, 'utf-8');
    }

    if (includeReferences) {
      const referencesDir = path.join(skillDir, 'references');
      fs.mkdirSync(referencesDir, { recursive: true });

      // Create example reference
      const exampleRef = `# ${normalizedName} Reference

## Overview

Add detailed documentation here that the agent can reference.

## API Reference

Document any APIs, commands, or detailed specifications here.

## Examples

Add usage examples and patterns.
`;
      fs.writeFileSync(path.join(referencesDir, 'README.md'), exampleRef, 'utf-8');
    }

    if (includeAssets) {
      const assetsDir = path.join(skillDir, 'assets');
      fs.mkdirSync(assetsDir, { recursive: true });

      // Create .gitkeep to preserve empty directory
      fs.writeFileSync(path.join(assetsDir, '.gitkeep'), '', 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: `Skill "${normalizedName}" created successfully`,
      path: skillDir,
      files: {
        skillJson: skillConfig ? path.join(skillDir, 'skill.json') : null,
        skillMd: skillMdPath,
        scripts: includeScripts ? path.join(skillDir, 'scripts') : null,
        references: includeReferences ? path.join(skillDir, 'references') : null,
        assets: includeAssets ? path.join(skillDir, 'assets') : null,
      }
    });

  } catch (error) {
    console.error('[Skills API] Error creating skill:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create skill' },
      { status: 500 }
    );
  }
}
