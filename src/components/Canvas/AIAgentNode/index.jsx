import { useEffect, useCallback, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from "react-i18next"
import {
  PencilSquareIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline'

const handleStyle = {}

function AIAgentNode({ id, data, isConnectable }) {
  const { t } = useTranslation()
  const [activeWorkflowItem, setActiveWorkflowItem] = useState(false)
  
  useEffect(() => {
    if (activeWorkflowItem == true) {
      data.activeWorkflowItem = true
      setActiveWorkflowItem(false)
    }
  }, [activeWorkflowItem])

  const agentType = data?.config?.agent_type || 'data-analysis'
  const agentName = data?.name || 'AI Agent'

  return (
    <div className="text-updater-node border-2 border-blue-600 w-40 h-40 bg-gradient-to-br from-blue-500 to-purple-600">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="flex justify-end" onClick={() => setActiveWorkflowItem(true)}>
        <PencilSquareIcon 
          className={`w-5 h-5 m-2 cursor-pointer hover:text-blue-200 text-white`}
        />
      </div>
      <div className="pt-0 p-6">
        <div className="items-center justify-center">
          <div className="flex items-center justify-center pb-4">
            <CpuChipIcon className="w-12 h-12 text-white" />
          </div>
          <p className="text-center text-white text-sm font-bold">{agentName}</p>
          <p className="text-center text-blue-200 text-xs">{agentType}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={handleStyle}
        isConnectable={isConnectable}
        isConnectableStart={true}
      />
    </div>
  )
}

export default AIAgentNode 