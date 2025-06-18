import { useEffect, useCallback, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { useTranslation } from "react-i18next"
import {
  PencilSquareIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

const handleStyle = {}

function ParserNode({ id, data, isConnectable }) {
  const { t } = useTranslation()
  const [activeWorkflowItem, setActiveWorkflowItem] = useState(false)
  
  useEffect(() => {
    if (activeWorkflowItem == true) {
      data.activeWorkflowItem = true
      setActiveWorkflowItem(false)
    }
  }, [activeWorkflowItem])

  const parseType = data?.parse_type || 'json'
  const parserName = data?.name || 'Parser'

  const getParserColor = (type) => {
    switch (type) {
      case 'json': return 'from-orange-500 to-red-600'
      case 'xml': return 'from-yellow-500 to-orange-600'
      case 'csv': return 'from-purple-500 to-pink-600'
      case 'text': return 'from-gray-500 to-slate-600'
      default: return 'from-orange-500 to-red-600'
    }
  }

  return (
    <div className={`text-updater-node border-2 border-orange-600 w-40 h-40 bg-gradient-to-br ${getParserColor(parseType)}`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="flex justify-end" onClick={() => setActiveWorkflowItem(true)}>
        <PencilSquareIcon 
          className={`w-5 h-5 m-2 cursor-pointer hover:text-orange-200 text-white`}
        />
      </div>
      <div className="pt-0 p-6">
        <div className="items-center justify-center">
          <div className="flex items-center justify-center pb-4">
            <DocumentTextIcon className="w-12 h-12 text-white" />
          </div>
          <p className="text-center text-white text-sm font-bold">{parserName}</p>
          <p className="text-center text-orange-200 text-xs uppercase">{parseType}</p>
          <p className="text-center text-orange-100 text-xs">Parser</p>
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

export default ParserNode 