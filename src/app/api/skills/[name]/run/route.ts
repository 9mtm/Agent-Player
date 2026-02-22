import { NextRequest, NextResponse } from 'next/server';
import { skillExecutor } from '@/lib/skills/executor';

export async function POST(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;

    try {
        // Parse args from body
        let args: string[] = [];
        try {
            const body = await request.json();
            if (Array.isArray(body.args)) {
                args = body.args;
            } else if (body.input) {
                // If input string provided, split by space (naive) or pass as single arg
                args = [body.input];
            }
        } catch (e) {
            // ignore JSON parse error, assume empty args
        }

        const result = await skillExecutor.execute(name, args);

        return NextResponse.json({
            success: result.exitCode === 0,
            ...result
        });

    } catch (error) {
        console.error(`Execution failed for ${name}:`, error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown execution error',
                stdout: '',
                stderr: ''
            },
            { status: 500 }
        );
    }
}
