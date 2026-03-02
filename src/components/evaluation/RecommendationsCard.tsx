'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react';

interface RecommendationsCardProps {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    loading?: boolean;
}

export function RecommendationsCard({
    strengths,
    weaknesses,
    recommendations,
    loading = false,
}: RecommendationsCardProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Analysis & Recommendations</CardTitle>
                    <CardDescription>Loading analysis...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Analysis & Recommendations</CardTitle>
                <CardDescription>
                    AI-generated insights based on performance data
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Strengths */}
                {strengths && strengths.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle className="w-5 h-5" />
                            <span>Strengths</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {strengths.map((strength, index) => (
                                <Badge
                                    key={index}
                                    variant="outline"
                                    className="bg-green-50 text-green-700 border-green-200"
                                >
                                    {strength}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Weaknesses */}
                {weaknesses && weaknesses.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-orange-600 font-medium">
                            <AlertTriangle className="w-5 h-5" />
                            <span>Areas for Improvement</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {weaknesses.map((weakness, index) => (
                                <Badge
                                    key={index}
                                    variant="outline"
                                    className="bg-orange-50 text-orange-700 border-orange-200"
                                >
                                    {weakness}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recommendations */}
                {recommendations && recommendations.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-600 font-medium">
                            <Lightbulb className="w-5 h-5" />
                            <span>Recommendations</span>
                        </div>
                        <ul className="space-y-2 list-none">
                            {recommendations.map((recommendation, index) => (
                                <li
                                    key={index}
                                    className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
                                >
                                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                                    <span className="text-sm text-blue-900">{recommendation}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Empty State */}
                {(!strengths || strengths.length === 0) &&
                    (!weaknesses || weaknesses.length === 0) &&
                    (!recommendations || recommendations.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                            No analysis available yet. Run an evaluation to generate insights.
                        </div>
                    )}
            </CardContent>
        </Card>
    );
}
