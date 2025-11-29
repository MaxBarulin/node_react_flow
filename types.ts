import { Node, Edge } from 'reactflow';

// Supported operations for Math Nodes
export type MathOperation = 'add' | 'subtract' | 'multiply' | 'divide';

// Data structure stored inside a Node's 'data' property
export interface NodeData {
  label?: string;
  value?: number; // Current calculated value
  inputValue?: number; // User manually entered value (for Input nodes)
  operation?: MathOperation; // For Math nodes
  
  // Callbacks to update the graph from within a node
  onChange?: (id: string, value: number) => void;
}

// Custom Node Types map
export type AppNode = Node<NodeData>;
export type AppEdge = Edge;

export enum NodeType {
  INPUT = 'inputNode',
  OUTPUT = 'outputNode',
  MATH = 'mathNode'
}
