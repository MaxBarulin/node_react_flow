import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, MathOperation } from '../types';
import { Calculator, Divide, GripHorizontal, Minus, Plus, X } from 'lucide-react';

// --- Helper Components ---

interface NodeWrapperProps {
  title: string;
  colorClass: string;
  selected?: boolean;
}

const NodeWrapper = ({ children, title, colorClass, selected }: React.PropsWithChildren<NodeWrapperProps>) => (
  <div className={`shadow-lg rounded-lg border-2 bg-slate-800 min-w-[150px] transition-all duration-200 ${selected ? 'border-white ring-2 ring-blue-500/50' : 'border-slate-700 hover:border-slate-600'}`}>
    <div className={`px-3 py-1 text-xs font-bold uppercase tracking-wider text-white rounded-t-[5px] flex items-center gap-2 ${colorClass}`}>
      {title}
    </div>
    <div className="p-3">
      {children}
    </div>
  </div>
);

// --- Node Components ---

export const InputNode = memo(({ data, isConnectable, selected, id }: NodeProps<NodeData>) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (data.onChange) {
      data.onChange(id, val);
    }
  };

  return (
    <NodeWrapper title="Input" colorClass="bg-emerald-600" selected={!!selected}>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400">Value</label>
        <input
          className="nodrag bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500 w-full"
          type="number"
          value={data.inputValue ?? 0}
          onChange={handleChange}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="!bg-emerald-500 !w-3 !h-3 !-right-1.5"
      />
    </NodeWrapper>
  );
});

export const OutputNode = memo(({ data, isConnectable, selected }: NodeProps<NodeData>) => {
  return (
    <NodeWrapper title="Output" colorClass="bg-rose-600" selected={!!selected}>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="!bg-rose-500 !w-3 !h-3 !-left-1.5"
      />
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400">Result</label>
        <div className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xl font-mono text-right text-rose-400 font-bold overflow-hidden text-ellipsis">
          {data.value !== undefined ? Number(data.value).toFixed(2) : '---'}
        </div>
      </div>
    </NodeWrapper>
  );
});

export const MathNode = memo(({ data, isConnectable, selected }: NodeProps<NodeData>) => {
  const getIcon = (op?: MathOperation) => {
    switch (op) {
      case 'add': return <Plus size={16} />;
      case 'subtract': return <Minus size={16} />;
      case 'multiply': return <X size={16} />;
      case 'divide': return <Divide size={16} />;
      default: return <Calculator size={16} />;
    }
  };

  const getLabel = (op?: MathOperation) => {
      switch (op) {
      case 'add': return 'Add';
      case 'subtract': return 'Subtract';
      case 'multiply': return 'Multiply';
      case 'divide': return 'Divide';
      default: return 'Math';
    }
  }

  return (
    <NodeWrapper title={getLabel(data.operation)} colorClass="bg-blue-600" selected={!!selected}>
      <Handle
        type="target"
        position={Position.Left}
        id="a"
        style={{ top: '30%' }}
        isConnectable={isConnectable}
        className="!bg-blue-400 !w-3 !h-3 !-left-1.5"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="b"
        style={{ top: '70%' }}
        isConnectable={isConnectable}
        className="!bg-blue-400 !w-3 !h-3 !-left-1.5"
      />
      
      <div className="flex justify-center items-center h-10 text-slate-300">
        {getIcon(data.operation)}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="!bg-blue-500 !w-3 !h-3 !-right-1.5"
      />
    </NodeWrapper>
  );
});