// Edge types and utilities
export interface Edge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  label?: string;
}

export const initialEdges: Edge[] = [];
