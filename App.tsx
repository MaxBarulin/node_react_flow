import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  Panel,
  ReactFlowInstance,
  MiniMap,
  NodeChange,
  EdgeChange
} from 'reactflow';
import { Plus, Calculator, MonitorUp, MonitorDown, MousePointer2, Undo2, Redo2 } from 'lucide-react';

import { AppNode, AppEdge, NodeData, NodeType, MathOperation } from './types';
import { InputNode, OutputNode, MathNode } from './components/CustomNodes';
import SettingsPanel from './components/SettingsPanel';
import { calculateGraph } from './utils/graphUtils';

// --- Initial Data ---
const initialNodes: AppNode[] = [
  { id: '1', type: NodeType.INPUT, position: { x: 50, y: 50 }, data: { inputValue: 10 } },
  { id: '2', type: NodeType.INPUT, position: { x: 50, y: 200 }, data: { inputValue: 5 } },
  { id: '3', type: NodeType.MATH, position: { x: 300, y: 100 }, data: { operation: 'add' } },
  { id: '4', type: NodeType.OUTPUT, position: { x: 600, y: 125 }, data: { value: 15 } },
];

const initialEdges: AppEdge[] = [
  { id: 'e1-3a', source: '1', target: '3', targetHandle: 'a', animated: true },
  { id: 'e2-3b', source: '2', target: '3', targetHandle: 'b', animated: true },
  { id: 'e3-4', source: '3', target: '4', animated: true },
];

let id = 5;
const getId = () => `${id++}`;

const Flow = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // --- History Management ---
  const [history, setHistory] = useState<{ past: {nodes: AppNode[], edges: AppEdge[]}[], future: {nodes: AppNode[], edges: AppEdge[]}[] }>({ past: [], future: [] });
  
  // Refs to track current state for snapshotting without stale closures
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const takeSnapshot = useCallback(() => {
    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    setHistory(prev => {
      // Prevent duplicate snapshots (e.g. clicking a node without moving)
      const last = prev.past[prev.past.length - 1];
      if (last) {
        // Basic shallow check for identity or deep check for values
        // Stringify is okay for this app size
        if (JSON.stringify(last.nodes) === JSON.stringify(currentNodes) && 
            JSON.stringify(last.edges) === JSON.stringify(currentEdges)) {
          return prev;
        }
      }

      return {
        past: [...prev.past.slice(-20), { nodes: currentNodes, edges: currentEdges }],
        future: []
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (history.past.length === 0) return;

    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    setHistory(prev => {
      const newPast = [...prev.past];
      const stateToRestore = newPast.pop();
      
      if (!stateToRestore) return prev;

      setNodes(stateToRestore.nodes);
      setEdges(stateToRestore.edges);

      return {
        past: newPast,
        future: [{ nodes: currentNodes, edges: currentEdges }, ...prev.future]
      };
    });
  }, [history.past, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (history.future.length === 0) return;

    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    setHistory(prev => {
      const newFuture = [...prev.future];
      const stateToRestore = newFuture.shift();

      if (!stateToRestore) return prev;

      setNodes(stateToRestore.nodes);
      setEdges(stateToRestore.edges);

      return {
        past: [...prev.past, { nodes: currentNodes, edges: currentEdges }],
        future: newFuture
      };
    });
  }, [history.future, setNodes, setEdges]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        redo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Define custom node types
  const nodeTypes = useMemo(() => ({
    [NodeType.INPUT]: InputNode,
    [NodeType.OUTPUT]: OutputNode,
    [NodeType.MATH]: MathNode,
  }), []);

  // --- Graph Calculation Logic ---
  
  // Update graph whenever connections or inputs change
  useEffect(() => {
    setNodes((nds) => {
        const calculatedNodes = calculateGraph(nds, edges);
        
        const hasChanges = nds.some((n, i) => {
            const calculated = calculatedNodes.find(cn => cn.id === n.id);
            return calculated && calculated.data.value !== n.data.value;
        });

        return hasChanges ? calculatedNodes : nds;
    });
  }, [edges, nodes.map(n => n.data.inputValue).join(','), nodes.map(n => n.data.operation).join(',')]);


  // --- Event Handlers & Wrappers ---

  const onNodesChangeWrapped = useCallback((changes: NodeChange[]) => {
    // Snapshot on remove or reset. Position changes are handled by drag events.
    if (changes.some(c => c.type === 'remove' || c.type === 'reset')) {
      takeSnapshot();
    }
    onNodesChange(changes);
  }, [onNodesChange, takeSnapshot]);

  const onEdgesChangeWrapped = useCallback((changes: EdgeChange[]) => {
    if (changes.some(c => c.type === 'remove' || c.type === 'reset')) {
      takeSnapshot();
    }
    onEdgesChange(changes);
  }, [onEdgesChange, takeSnapshot]);

  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges, takeSnapshot]
  );

  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      const op = event.dataTransfer.getData('application/operation');

      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: AppNode = {
        id: getId(),
        type: type as any,
        position,
        data: { 
          label: `${type} node`, 
          inputValue: 0,
          operation: op ? (op as MathOperation) : undefined,
          onChange: updateNodeValue 
        },
      };

      takeSnapshot();
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, takeSnapshot]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // --- Data Updaters ---

  const updateNodeValue = useCallback((id: string, val: number) => {
    takeSnapshot();
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, inputValue: val };
        }
        return node;
      })
    );
  }, [setNodes, takeSnapshot]);

  const updateNodeData = (id: string, newData: Partial<NodeData>) => {
    takeSnapshot();
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          node.data = { ...node.data, ...newData };
        }
        return node;
      })
    );
  };

  const deleteNode = (id: string) => {
      takeSnapshot();
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      setSelectedNodeId(null);
  }

  // --- Helper for Sidebar Draggables ---
  const onDragStart = (event: React.DragEvent, nodeType: string, operation?: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    if (operation) event.dataTransfer.setData('application/operation', operation);
    event.dataTransfer.effectAllowed = 'move';
  };

  const selectedNode = useMemo(() => 
    nodes.find((n) => n.id === selectedNodeId) || null
  , [nodes, selectedNodeId]);

  // Inject the onChange handler into initial nodes on mount
  useEffect(() => {
    // Only inject if not already present or if we need to refresh logic (though updateNodeValue is stable now)
    setNodes((nds) => nds.map(n => ({ ...n, data: { ...n.data, onChange: updateNodeValue } })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-900">
      {/* --- Left Sidebar (Palette) --- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="text-blue-500" />
            NodeCalc
          </h1>
          <p className="text-xs text-slate-400 mt-1">Drag nodes to the canvas</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* IO Section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">I/O Nodes</h3>
            <div className="space-y-3">
              <div
                className="bg-emerald-900/30 border border-emerald-700 p-3 rounded cursor-grab hover:bg-emerald-900/50 transition-colors flex items-center gap-3 group"
                onDragStart={(event) => onDragStart(event, NodeType.INPUT)}
                draggable
              >
                <MonitorUp className="text-emerald-400" size={20} />
                <div>
                  <div className="text-sm font-medium text-emerald-100 group-hover:text-white">Input Node</div>
                  <div className="text-xs text-emerald-500/70">Number entry</div>
                </div>
              </div>

              <div
                className="bg-rose-900/30 border border-rose-700 p-3 rounded cursor-grab hover:bg-rose-900/50 transition-colors flex items-center gap-3 group"
                onDragStart={(event) => onDragStart(event, NodeType.OUTPUT)}
                draggable
              >
                <MonitorDown className="text-rose-400" size={20} />
                <div>
                  <div className="text-sm font-medium text-rose-100 group-hover:text-white">Output Node</div>
                  <div className="text-xs text-rose-500/70">Display result</div>
                </div>
              </div>
            </div>
          </div>

          {/* Math Section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Math Operations</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { op: 'add', label: 'Add', symbol: '+' },
                { op: 'subtract', label: 'Subtract', symbol: '-' },
                { op: 'multiply', label: 'Multiply', symbol: '×' },
                { op: 'divide', label: 'Divide', symbol: '÷' },
              ].map((item) => (
                <div
                  key={item.op}
                  className="bg-blue-900/20 border border-blue-800 p-3 rounded cursor-grab hover:bg-blue-900/40 hover:border-blue-600 transition-all flex flex-col items-center justify-center gap-1 group text-center"
                  onDragStart={(event) => onDragStart(event, NodeType.MATH, item.op)}
                  draggable
                >
                  <span className="text-lg font-bold text-blue-400 group-hover:text-blue-200">{item.symbol}</span>
                  <span className="text-xs text-slate-400 group-hover:text-white">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
          v1.1.0 &bull; React Flow
        </div>
      </aside>

      {/* --- Main Canvas --- */}
      <main className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeWrapped}
          onEdgesChange={onEdgesChangeWrapped}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onNodeDragStart={onNodeDragStart}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-950"
        >
          <Background color="#334155" gap={16} />
          <Controls className="bg-slate-800 border-slate-700 fill-slate-200 text-slate-200" />
          <MiniMap 
            className="bg-slate-800 border border-slate-700 rounded-lg" 
            nodeColor={(n) => {
              if (n.type === NodeType.INPUT) return '#059669';
              if (n.type === NodeType.OUTPUT) return '#e11d48';
              return '#2563eb';
            }}
          />
          <Panel position="top-left" className="flex gap-2">
            <button 
              onClick={undo} 
              disabled={history.past.length === 0}
              className={`p-2 rounded-md border transition-all ${
                history.past.length === 0 
                ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' 
                : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </button>
            <button 
              onClick={redo} 
              disabled={history.future.length === 0}
              className={`p-2 rounded-md border transition-all ${
                history.future.length === 0 
                ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' 
                : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </button>
          </Panel>
          <Panel position="top-center" className="bg-slate-800/80 backdrop-blur text-slate-300 px-4 py-2 rounded-full text-xs border border-slate-700 shadow-lg">
            Drag nodes from the sidebar • Select nodes to edit
          </Panel>
        </ReactFlow>
      </main>

      {/* --- Right Settings Panel --- */}
      <aside className={`w-72 bg-slate-900 border-l border-slate-700 transition-all duration-300 transform ${selectedNodeId ? 'translate-x-0' : 'translate-x-full absolute right-0 h-full'} z-20 shadow-xl`}>
         <div className="h-full overflow-y-auto">
             <SettingsPanel 
                selectedNode={selectedNode} 
                updateNodeData={updateNodeData} 
                deleteNode={deleteNode}
             />
         </div>
      </aside>
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}