import { useEffect, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import DestinationIcon from '../../Icons/Destination.js'; // Import the image file;
import { useTranslation } from "react-i18next";

import {
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

const handleStyle = { };

function DestinationNode({ id, data, isConnectable, }) {
  const { t } = useTranslation();
  const [activeWorkflowItem, setActiveWorkflowItem] = useState(false);
  
  useEffect(() => {
    if (activeWorkflowItem == true) {
      data.activeWorkflowItem = true;
      setActiveWorkflowItem(false);
    }
  }, [activeWorkflowItem]);

  return (
    <div className="text-updater-node border-2 border-pink-600 w-40 h-40 bg-purple-500">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className="flex justify-end" onClick={() => setActiveWorkflowItem(true)}>
        <PencilSquareIcon 
          className={`w-5 h-5 m-2 cursor-pointer hover:text-green-600`}
        />
      </div>
      <div className="pt-0 p-6">
        <div className="items-center justify-center">
          <div className="flex items-center justify-center pb-4">
            <DestinationIcon width={60} height={60} />
          </div>
          <p className="text-center">{t("workflow.component.destination.title")}</p>
        </div>
      </div>
    </div>
  );
}

export default DestinationNode;
