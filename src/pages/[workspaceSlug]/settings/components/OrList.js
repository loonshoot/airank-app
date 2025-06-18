import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';

const DraggableRule = ({ rule }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: rule.name,
    data: { type: 'rule', rule: rule.name, label: rule.label }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border border-gray-200 rounded-md px-4 py-2 cursor-move hover:bg-gray-50"
    >
      <span className="text-sm font-medium text-gray-900">{rule.label}</span>
    </div>
  );
};

const OrList = ({ items = [], isAdjustable = false, onChange }) => {
  // Convert initial items to state object structure
  const initialState = (items || []).reduce((acc, item, index) => {
    acc[index] = { [item.name]: null };
    return acc;
  }, {});

  const [mergeState, setMergeState] = useState(initialState);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!active || !over || active.id === over.id) {
      return;
    }

    setMergeState((prev) => {
      const newState = { ...prev };
      const fromIndex = Object.keys(prev).find(key => 
        Object.keys(prev[key])[0] === active.id
      );
      const toIndex = Object.keys(prev).find(key => 
        Object.keys(prev[key])[0] === over.id
      );

      if (fromIndex && toIndex) {
        const [movedItem] = Object.entries(prev[fromIndex]);
        const [targetItem] = Object.entries(prev[toIndex]);
        
        newState[fromIndex] = { [targetItem[0]]: null };
        newState[toIndex] = { [movedItem[0]]: null };
      }

      console.log('Updated merge state:', newState);
      onChange?.(newState);
      return newState;
    });
  };

  const toggleConnection = (groupKey) => {
    if (!isAdjustable) return;
    
    setMergeState(prev => {
      const newState = { ...prev };
      const group = newState[groupKey];
      const firstRule = Object.keys(group)[0];
      
      if (Object.keys(group).length > 1) {
        newState[groupKey] = { [firstRule]: null };
      } else {
        newState[groupKey] = { [firstRule]: null };
      }
      
      console.log('Updated merge state:', newState);
      onChange?.(newState);
      return newState;
    });
  };

  const handleDeleteRule = (groupKey, ruleKey) => {
    setMergeState(prev => {
      const newState = { ...prev };
      const group = newState[groupKey];
      
      if (Object.keys(group).length > 1) {
        const { [ruleKey]: _, ...remainingRules } = group;
        newState[groupKey] = remainingRules;
      } else {
        delete newState[groupKey];
        return Object.entries(newState)
          .sort(([a], [b]) => Number(a) - Number(b))
          .reduce((acc, [_, value], index) => {
            acc[index] = value;
            return acc;
          }, {});
      }
      
      console.log('Updated merge state:', newState);
      onChange?.(newState);
      return newState;
    });
  };

  const handleDeleteGroup = (groupKey) => {
    setMergeState(prev => {
      const newState = { ...prev };
      delete newState[groupKey];
      
      const reindexed = Object.entries(newState)
        .sort(([a], [b]) => Number(a) - Number(b))
        .reduce((acc, [_, value], index) => {
          acc[index] = value;
          return acc;
        }, {});
      
      console.log('Updated merge state:', reindexed);
      onChange?.(reindexed);
      return reindexed;
    });
  };

  // Get sortable items from merge state
  const sortableItems = Object.entries(mergeState).map(([key, group]) => ({
    id: Object.keys(group)[0],
    groupKey: key,
    ...group
  }));

  // Available rules that can be dragged
  const availableRules = [
    { name: 'id', label: 'ID' },
    { name: 'emailAddress', label: 'Email Address' },
    { name: 'phoneNumber', label: 'Phone Number' },
    { name: 'companyName', label: 'Company Name' },
    { name: 'firstName', label: 'First Name' },
    { name: 'lastName', label: 'Last Name' },
    { name: 'address', label: 'Address' },
    { name: 'phoneMobile', label: 'Phone (Mobile)' },
    { name: 'phoneWork', label: 'Phone (Work)' }
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <DndContext 
          sensors={sensors}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={sortableItems.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortableItems.map((item) => {
              const isAndGroup = Object.keys(mergeState[item.groupKey]).length > 1;
              
              return (
                <React.Fragment key={item.groupKey}>
                  <div className={`relative ${isAndGroup ? "border-dotted border-2 border-gray-400 p-3 -mx-3 mb-6" : ""}`}>
                    {isAdjustable && isAndGroup && (
                      <button
                        onClick={() => handleDeleteGroup(item.groupKey)}
                        className="absolute -top-2 -right-2 p-1 bg-white rounded-full border border-gray-200 hover:bg-red-50 group"
                      >
                        <XMarkIcon className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                      </button>
                    )}
                    
                    {Object.entries(mergeState[item.groupKey]).map(([ruleKey]) => {
                      const rule = availableRules.find(r => r.name === ruleKey);
                      return (
                        <div key={ruleKey} className="mb-3 last:mb-0">
                          <div className="border border-gray-200 rounded-md px-6 py-3 w-full relative">
                            <span className="text-sm font-medium text-gray-900">
                              {rule?.label || ruleKey}
                            </span>
                            {isAdjustable && (
                              <button
                                onClick={() => handleDeleteRule(item.groupKey, ruleKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-red-50 rounded-full group"
                              >
                                <XMarkIcon className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex flex-col items-center justify-center my-2">
                      <button 
                        onClick={() => toggleConnection(item.groupKey)}
                        disabled={!isAdjustable}
                        className={`text-sm ${isAdjustable ? 'hover:text-blue-500 cursor-pointer' : ''}`}
                      >
                        <span className={isAndGroup ? 'text-gray-400' : 'text-blue-500 font-medium'}>OR</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className={isAndGroup ? 'text-blue-500 font-medium' : 'text-gray-400'}>AND</span>
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </SortableContext>
        </DndContext>

        {isAdjustable && (
          <div className="border rounded-md p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Available Rules</h4>
            <div className="grid grid-cols-2 gap-2">
              {availableRules.map(rule => (
                <DraggableRule key={rule.name} rule={rule} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrList; 