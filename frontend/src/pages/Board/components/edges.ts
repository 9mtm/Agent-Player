export interface Edge {
  id: string;
  source: string; // node id
  sourcePort: string; // output port id
  target: string; // node id
  targetPort: string; // input port id
  label?: string;
}

export const initialEdges: Edge[] = [
  // Example:
  // { id: 'e1', source: 'node1', sourcePort: 'output', target: 'node2', targetPort: 'input' }
];
