import React, { memo } from 'react';
import ReactFlow, { Handle, Position } from 'reactflow';

function TriggerNode({ data }) {
  return (
    <div className="px-4 py-2 bg-white border w-40 h-48">
      <div className="flex">
        <div className="ml-2">
          <div className="text-lg font-bold">Data Lake</div>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="w-24 invisible stroke-2" />
    </div>
  );
}

export default TriggerNode;