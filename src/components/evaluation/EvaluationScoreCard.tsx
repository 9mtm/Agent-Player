'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EvaluationScoreCardProps {
    score: number;
    grade: string;
    previousScore?: number;
    loading?: boolean;
}

const GRADE_COLORS = {
    'A+': 'text-green-600 bg-green-100',
    'A': 'text-green-600 bg-green-100',
    'B+': 'text-blue-600 bg-blue-100',
    'B': 'text-blue-600 bg-blue-100',
    'C+': 'text-yellow-600 bg-yellow-100',
    'C': 'text-yellow-600 bg-yellow-100',
    'D': 'text-orange-600 bg-orange-100',
    'F': 'text-red-600 bg-red-100',
};

export function EvaluationScoreCard({
    score,
    grade,
    previousScore,
    loading = false,
}: EvaluationScoreCardProps) {
    const gradeColor = GRADE_COLORS[grade as keyof typeof GRADE_COLORS] || 'text-gray-600 bg-gray-100';

    const trend = previousScore ? score - previousScore : 0;
    const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600';

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Overall Evaluation
                    </CardTitle>
                    <CardDescription>Loading evaluation scores...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-24 bg-gray-200 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Overall Evaluation
                </CardTitle>
                <CardDescription>
                    Composite quality score across all metrics
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    {/* Score Display */}
                    <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold">{score}</span>
                            <span className="text-xl text-gray-500">/100</span>
                        </div>

                        {/* Trend Indicator */}
                        {previousScore && trend !== 0 && (
                            <div className={`flex items-center gap-1 mt-2 ${trendColor}`}>
                                <TrendIcon className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                    {Math.abs(trend).toFixed(1)} pts from last evaluation
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Grade Badge */}
                    <div
                        className={`flex items-center justify-center w-24 h-24 rounded-full ${gradeColor} text-4xl font-bold`}
                    >
                        {grade}
                    </div>
                </div>

                {/* Score Bar */}
                <div className="mt-6 space-y-2">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${
                                score >= 90
                                    ? 'bg-green-500'
                                    : score >= 80
                                    ? 'bg-blue-500'
                                    : score >= 70
                                    ? 'bg-yellow-500'
                                    : score >= 60
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                            }`}
                            style={{ width: `${score}%` }}
                        ></div>
                    </div>

                    {/* Score Labels */}
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>0</span>
                        <span>25</span>
                        <span>50</span>
                        <span>75</span>
                        <span>100</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
