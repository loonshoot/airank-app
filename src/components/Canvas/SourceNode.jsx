import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

function SourceNode({ data }) {
  return (
    <div className="px-4 py-2 bg-white border">
      <div className="flex">
        <div className="ml-2">
          <div className="text-lg font-bold">{data.label}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-24 invisible stroke-2" />
    </div>
  );
}

export default SourceNode;
