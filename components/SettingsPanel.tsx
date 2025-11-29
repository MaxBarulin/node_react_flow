import React from 'react';
import { AppNode, MathOperation, NodeType } from '../types';
import { Settings2, Trash2 } from 'lucide-react';

interface SettingsPanelProps {
  selectedNode: AppNode | null;
  updateNodeData: (id: string, newData: Partial<any>) => void;
  deleteNode: (id: string) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ selectedNode, updateNodeData, deleteNode }) => {
  if (!selectedNode) {
    return (
      <div className="p-6 text-slate-500 text-center flex flex-col items-center gap-4 mt-10">
        <Settings2 size={48} className="opacity-20" />
        <p className="text-sm">Select a node to view and edit its parameters.</p>
      </div>
    );
  }

  const { data, type, id } = selectedNode;

  return (
    <div className="p-4 flex flex-col gap-6">
      <div className="border-b border-slate-700 pb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings2 size={18} />
          Node Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">ID: <span className="font-mono">{id}</span></p>
      </div>

      {/* Input Node Settings */}
      {type === NodeType.INPUT && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Input Value</label>
            <input
              type="number"
              value={data.inputValue ?? 0}
              onChange={(e) => updateNodeData(id, { inputValue: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>
        </div>
      )}

      {/* Math Node Settings */}
      {type === NodeType.MATH && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Operation</label>
            <select
              value={data.operation || 'add'}
              onChange={(e) => updateNodeData(id, { operation: e.target.value as MathOperation })}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="add">Addition (+)</option>
              <option value="subtract">Subtraction (-)</option>
              <option value="multiply">Multiplication (×)</option>
              <option value="divide">Division (÷)</option>
            </select>
          </div>
        </div>
      )}

      {/* Output Node Settings */}
      {type === NodeType.OUTPUT && (
        <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
           <p className="text-sm text-slate-400">Current Value:</p>
           <p className="text-2xl font-bold text-rose-400 font-mono mt-1">
             {data.value !== undefined && !isNaN(data.value) ? Number(data.value).toFixed(4) : 'No Input'}
           </p>
        </div>
      )}

      <div className="mt-auto pt-6 border-t border-slate-700">
         <button 
          onClick={() => deleteNode(id)}
          className="w-full flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 py-2 px-4 rounded transition-colors text-sm font-medium"
         >
           <Trash2 size={16} />
           Delete Node
         </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
