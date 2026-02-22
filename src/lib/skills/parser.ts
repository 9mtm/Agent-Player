import matter from 'gray-matter';
import { ParsedSkill, SkillMetadataSchema } from './types';

/**
 * Parses SKILL.md content
 */
export function parseSkillMarkdown(content: string): ParsedSkill {
    try {
        // Parse frontmatter
        const { data, content: markdownBody } = matter(content);

        // Fallback extraction if frontmatter is missing data
        let name = data.name;
        let description = data.description;
        let version = data.version || '1.0.0';

        // Extract name from first header if missing
        if (!name) {
            const titleMatch = markdownBody.match(/^#\s+(.+)$/m);
            if (titleMatch) {
                name = titleMatch[1].trim();
            } else {
                name = 'Untitled Skill';
            }
        }

        // Extract description from first paragraph if missing
        if (!description) {
            // Remove headers and code blocks to find text
            const cleanText = markdownBody
                .replace(/^#+\s+.+$/gm, '') // remove headers
                .replace(/```[\s\S]*?```/g, '') // remove code blocks
                .trim();
            const firstPara = cleanText.split('\n\n')[0];
            description = firstPara ? firstPara.slice(0, 200).replace(/\n/g, ' ') : 'No description provided';
        }

        // Prepare metadata object
        const rawMetadata = {
            ...data,
            name,
            description,
            version,
        };

        // Validate or fallback to default schema
        // We use safeParse to avoid throwing immediately if optional fields are wrong
        const result = SkillMetadataSchema.safeParse(rawMetadata);

        // If validation fails, we try to construct a valid minimal object
        // ignoring the Zod error for now to allow "loose" skills, 
        // effectively treating our extraction as the source of truth
        const metadata: any = result.success ? result.data : rawMetadata;

        // Extract examples (simple regex based extraction for now)
        // Looks for ```typescript or ```javascript blocks
        const examples: ParsedSkill['examples'] = [];
        const codeBlockRegex = /```(typescript|javascript|json|bash|python|sh)\n([\s\S]*?)```/g;
        let match;

        while ((match = codeBlockRegex.exec(markdownBody)) !== null) {
            examples.push({
                title: 'Example',
                language: match[1],
                code: match[2].trim(),
            });
        }

        return {
            metadata,
            markdown: content,
            instructions: markdownBody.trim(),
            examples,
        };
    } catch (error) {
        // Fallback for catastrophic failure
        console.error("Parser failed, returning minimal skill", error);
        return {
            metadata: {
                name: 'Broken Skill',
                description: 'Failed to parse content',
                version: '0.0.0',
            } as any,
            markdown: content,
            instructions: content,
            examples: []
        };
    }
}
