import { useState } from "react";
import type { ChildAgent } from "../types";

export const useChildAgents = () => {
  const [agents, setAgents] = useState<ChildAgent[]>([
    {
      id: 1,
      name: "Research Agent",
      status: "active",
      description: "Handles research tasks",
    },
    {
      id: 2,
      name: "Analysis Agent",
      status: "idle",
      description: "Performs data analysis",
    },
  ]);

  const addAgent = () => {
    const newId = Math.max(...agents.map((a) => a.id), 0) + 1;
    const newAgent: ChildAgent = {
      id: newId,
      name: `Agent ${newId}`,
      status: "idle",
      description: "New agent ready for configuration",
    };
    setAgents([...agents, newAgent]);
  };

  const removeAgent = (id: number) => {
    setAgents(agents.filter((a) => a.id !== id));
  };

  const updateAgent = (id: number, updates: Partial<ChildAgent>) => {
    setAgents(
      agents.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      )
    );
  };

  return { agents, addAgent, removeAgent, updateAgent };
};
