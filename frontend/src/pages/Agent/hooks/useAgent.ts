import { useState, useRef, useEffect, useCallback } from "react";
import { agentsService } from "../../../services";
import { createNewAgentData, parseApiError } from "../utils/constants";
import type { Agent, CreateAgentRequest, AgentState } from "../types";
import type { WorkflowBoardHandle } from "../../Board/components";

export const useAgent = () => {
  // State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Refs
  const boardRef = useRef<WorkflowBoardHandle>(null);

  // Load agents from backend
  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await agentsService.getAgents();
      // Ensure we always have an array
      setAgents(response?.agents || []);
    } catch (err: unknown) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      console.error("Error loading agents:", err);
      // Set empty array on error
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new agent
  const createNewAgent = useCallback(async () => {
    try {
      setError(null);
      const newAgentData: CreateAgentRequest = createNewAgentData(
        agents.length
      );

      const newAgent = await agentsService.createAgent(newAgentData);
      setAgents((prevAgents) => [...prevAgents, newAgent]);
      setSelectedAgent(newAgent.id.toString());
    } catch (err: unknown) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      console.error("Error creating agent:", err);
    }
  }, [agents.length]);

  // Delete agent
  const deleteAgent = useCallback(
    async (agentId: number) => {
      try {
        setError(null);
        await agentsService.deleteAgent(agentId);
        setAgents((prevAgents) => prevAgents.filter((a) => a.id !== agentId));

        if (selectedAgent === agentId.toString()) {
          setSelectedAgent(null);
        }
      } catch (err: unknown) {
        const errorMessage = parseApiError(err);
        setError(errorMessage);
        console.error("Error deleting agent:", err);
      }
    },
    [selectedAgent]
  );

  // Toggle agent status
  const toggleAgentStatus = useCallback(
    async (agentId: number, isActive: boolean) => {
      try {
        setError(null);
        const updatedAgent = await agentsService.toggleAgent(agentId, isActive);
        setAgents((prevAgents) =>
          prevAgents.map((a) => (a.id === agentId ? updatedAgent : a))
        );
      } catch (err: unknown) {
        const errorMessage = parseApiError(err);
        setError(errorMessage);
        console.error("Error updating agent status:", err);
      }
    },
    []
  );

  // Duplicate agent
  const duplicateAgent = useCallback(async (agentId: number) => {
    try {
      setError(null);
      const duplicatedAgent = await agentsService.duplicateAgent(agentId);
      setAgents((prevAgents) => [...prevAgents, duplicatedAgent]);
    } catch (err: unknown) {
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      console.error("Error duplicating agent:", err);
    }
  }, []);

  // UI Actions
  const handleSelectAgent = useCallback((agentId: string | null) => {
    setSelectedAgent(agentId);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleOpenSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    loadAgents();
  }, [loadAgents]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize - load agents on mount
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000); // Clear error after 10 seconds

      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    // State
    agents,
    selectedAgent,
    loading,
    error,
    sidebarOpen,

    // Refs
    boardRef,

    // Agent CRUD operations
    loadAgents,
    createNewAgent,
    deleteAgent,
    toggleAgentStatus,
    duplicateAgent,

    // UI actions
    handleSelectAgent,
    handleToggleSidebar,
    handleOpenSidebar,
    handleRefresh,
    clearError,

    // State setters (for advanced use)
    setSelectedAgent,
    setSidebarOpen,
    setError,

    // Computed values
    selectedAgentData: agents.find((a) => a.id.toString() === selectedAgent),
    hasAgents: agents.length > 0,
    agentCount: agents.length,
  };
};
