import { useEffect, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import TriggerIcon from '../../Icons/Trigger.js'; // Import the image file
import { useTranslation } from "react-i18next";

import {
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

const handleStyle = { };

function TriggerNode({ id, data, isConnectable }) {
  const { t } = useTranslation();
  const [activeWorkflowItem, setActiveWorkflowItem] = useState(false);
  
  useEffect(() => {
    if (activeWorkflowItem == true) {
      data.activeWorkflowItem = true;
      setActiveWorkflowItem(false);
    }
  }, [activeWorkflowItem]);

  return (
    <div className="text-updater-node border-2 border-yellow-400 w-40 h-40 bg-purple-500">
      <div className="flex justify-end" onClick={() => setActiveWorkflowItem(true)}>
        <PencilSquareIcon 
          className={`w-5 h-5 m-2 cursor-pointer hover:text-yellow-400`}
        />
      </div>
      <div className="pt-0 p-6">
        <div className="items-center justify-center">
          <div className="flex items-center justify-center pb-4">
            <TriggerIcon width={60} height={60} />
          </div>
          <p className="text-center">{t("workflow.component.trigger.title")}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={handleStyle}
        isConnectable={isConnectable}
        isConnectableStart={true} // Only allow connections to start from this handle
      />
    </div>
  );
}

export default TriggerNode;
