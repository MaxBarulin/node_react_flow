import { Edge, Node } from 'reactflow';
import { AppNode, AppEdge, NodeData, NodeType } from '../types';

/**
 * Recalculates the values of all nodes in the graph based on inputs and connections.
 * This performs a forward pass simulation.
 */
export const calculateGraph = (nodes: AppNode[], edges: AppEdge[]): AppNode[] => {
  // Create a map for quick access
  const nodeMap = new Map<string, AppNode>();
  nodes.forEach(node => nodeMap.set(node.id, { ...node, data: { ...node.data } }));

  // Helper to get source value for a connection
  const getSourceValue = (targetNodeId: string, handleId?: string | null): number | undefined => {
    // Find edge connecting to this target handle
    const edge = edges.find(e => 
      e.target === targetNodeId && 
      (handleId ? e.targetHandle === handleId : true)
    );

    if (!edge) return undefined;

    const sourceNode = nodeMap.get(edge.source);
    // Use either the manually entered inputValue (for Input nodes) or the calculated value
    return sourceNode?.type === NodeType.INPUT 
      ? sourceNode.data.inputValue 
      : sourceNode?.data.value;
  };

  // We need to topologically sort or iteratively resolve. 
  // Since we might have cycles (though calculator shouldn't), simple iteration until stability is safer/easier for this scope.
  // We'll do a few passes to propagate values. Max depth 50 to prevent infinite loops.
  
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    for (const node of nodeMap.values()) {
      if (node.type === NodeType.INPUT) continue; // Inputs are static sources

      let newValue: number | undefined = undefined;

      if (node.type === NodeType.MATH) {
        const valA = getSourceValue(node.id, 'a');
        const valB = getSourceValue(node.id, 'b');

        if (valA !== undefined && valB !== undefined) {
          switch (node.data.operation) {
            case 'add': newValue = valA + valB; break;
            case 'subtract': newValue = valA - valB; break;
            case 'multiply': newValue = valA * valB; break;
            case 'divide': newValue = valB !== 0 ? valA / valB : NaN; break;
          }
        }
      } else if (node.type === NodeType.OUTPUT) {
        newValue = getSourceValue(node.id, null); // Output has one input, usually no handle ID needed or default
      }

      // Check if value actually changed
      if (node.data.value !== newValue) {
        node.data.value = newValue;
        changed = true;
      }
    }
  }

  return Array.from(nodeMap.values());
};
