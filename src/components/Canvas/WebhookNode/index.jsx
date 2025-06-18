import { useEffect, useCallback, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from "react-i18next"
import {
  PencilSquareIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'

const handleStyle = {}

function WebhookNode({ id, data, isConnectable }) {
  const { t } = useTranslation()
  const [activeWorkflowItem, setActiveWorkflowItem] = useState(false)
  
  useEffect(() => {
    if (activeWorkflowItem == true) {
      data.activeWorkflowItem = true
      setActiveWorkflowItem(false)
    }
  }, [activeWorkflowItem])

  const webhookUrl = data?.webhook_url || 'Configure URL'
  const method = data?.method || 'POST'

  return (
    <div className="text-updater-node border-2 border-green-600 w-40 h-40 bg-gradient-to-br from-green-500 to-teal-600">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="flex justify-end" onClick={() => setActiveWorkflowItem(true)}>
        <PencilSquareIcon 
          className={`w-5 h-5 m-2 cursor-pointer hover:text-green-200 text-white`}
        />
      </div>
      <div className="pt-0 p-6">
        <div className="items-center justify-center">
          <div className="flex items-center justify-center pb-4">
            <GlobeAltIcon className="w-12 h-12 text-white" />
          </div>
          <p className="text-center text-white text-sm font-bold">Webhook</p>
          <p className="text-center text-green-200 text-xs">{method}</p>
          <p className="text-center text-green-100 text-xs truncate px-2" title={webhookUrl}>
            {webhookUrl.length > 20 ? webhookUrl.substring(0, 20) + '...' : webhookUrl}
          </p>
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

export default WebhookNode 