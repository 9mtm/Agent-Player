import { useState } from "react";
import type { CategoryType, Category, TopData } from "../types";

export const useTopThree = () => {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryType>("agents");

  const categories: Category[] = [
    { id: "agents", label: "Top Agents", icon: "🤖" },
    { id: "workflows", label: "Top Workflows", icon: "🔄" },
    { id: "tasks", label: "Top Tasks", icon: "✅" },
    { id: "users", label: "Top Users", icon: "👥" },
  ];

  const topData: TopData = {
    agents: [
      {
        id: 1,
        name: "Customer Support Bot",
        score: 98,
        usage: "2.4K uses",
        trend: "+12%",
        description: "Handles customer inquiries with 98% satisfaction rate",
      },
      {
        id: 2,
        name: "Data Analyzer",
        score: 95,
        usage: "1.8K uses",
        trend: "+8%",
        description: "Processes and analyzes large datasets automatically",
      },
      {
        id: 3,
        name: "Content Generator",
        score: 92,
        usage: "1.2K uses",
        trend: "+15%",
        description: "Creates high-quality content for marketing campaigns",
      },
    ],
    workflows: [
      {
        id: 1,
        name: "Lead Generation Pipeline",
        score: 97,
        usage: "3.2K runs",
        trend: "+18%",
        description: "Automated lead qualification and nurturing system",
      },
      {
        id: 2,
        name: "Invoice Processing",
        score: 94,
        usage: "2.1K runs",
        trend: "+5%",
        description: "Streamlined invoice validation and approval workflow",
      },
      {
        id: 3,
        name: "Social Media Scheduler",
        score: 91,
        usage: "1.9K runs",
        trend: "+22%",
        description: "Automated content scheduling across all platforms",
      },
    ],
    tasks: [
      {
        id: 1,
        name: "Database Backup",
        score: 99,
        usage: "5.5K executions",
        trend: "+2%",
        description: "Daily automated database backup and verification",
      },
      {
        id: 2,
        name: "Email Campaign",
        score: 96,
        usage: "4.2K executions",
        trend: "+14%",
        description: "Personalized email marketing campaigns",
      },
      {
        id: 3,
        name: "Report Generation",
        score: 93,
        usage: "3.8K executions",
        trend: "+9%",
        description: "Weekly performance and analytics reports",
      },
    ],
    users: [
      {
        id: 1,
        name: "Sarah Chen",
        score: 98,
        usage: "147 projects",
        trend: "+25%",
        description:
          "Senior Automation Engineer with expertise in AI workflows",
      },
      {
        id: 2,
        name: "Michael Rodriguez",
        score: 95,
        usage: "132 projects",
        trend: "+19%",
        description: "Data Scientist specializing in ML automation",
      },
      {
        id: 3,
        name: "Emily Johnson",
        score: 92,
        usage: "98 projects",
        trend: "+31%",
        description: "Product Manager driving automation initiatives",
      },
    ],
  };

  const currentData = topData[selectedCategory];

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "🏅";
    }
  };

  const getTrendColor = (trend: string): string => {
    return trend.startsWith("+")
      ? "var(--success-color)"
      : "var(--error-color)";
  };

  const getPerformanceMetrics = () => {
    const averageScore = Math.round(
      currentData.reduce((sum, item) => sum + item.score, 0) /
        currentData.length
    );
    return {
      averageScore,
      growthRate: "+15%",
      totalItems: currentData.length,
      availability: "24/7",
    };
  };

  return {
    selectedCategory,
    setSelectedCategory,
    categories,
    currentData,
    getRankIcon,
    getTrendColor,
    getPerformanceMetrics,
  };
};
