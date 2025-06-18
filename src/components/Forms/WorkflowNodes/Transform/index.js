import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/Button/index';
import { ChevronRightIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'; // Added import statement

const WorkflowNodeForm = ({ deleteSourceName, handleDelete }) => {
  const { t } = useTranslation();
  const [confirmation, setConfirmation] = useState('');
  const [flexBoxes, setFlexBoxes] = useState([{
    selectValue: 'option1',
    inputValue: ''
  }]);

  const addFlexBox = () => {
    setFlexBoxes([...flexBoxes, {
      selectValue: 'option1',
      inputValue: ''
    }]);
  };

  const deleteFlexBox = (index) => {
    const updatedFlexBoxes = flexBoxes.filter((_, i) => i !== index);
    setFlexBoxes(updatedFlexBoxes);
  };

  const handleSelectChange = (index, value) => {
    const updatedFlexBoxes = flexBoxes.map((box, i) => {
      if (i === index) {
        return { ...box, selectValue: value };
      }
      return box;
    });
    setFlexBoxes(updatedFlexBoxes);
  };

  const handleInputChange = (index, value) => {
    const updatedFlexBoxes = flexBoxes.map((box, i) => {
      if (i === index) {
        return { ...box, inputValue: value };
      }
      return box;
    });
    setFlexBoxes(updatedFlexBoxes);
  };

  return (
    <div className="space-y-4">
      <p className="text-dark">Map your data to new fields</p>
      {flexBoxes.map((flexBox, index) => (
      <div className="flex flex-row space-x-5">
        <select
          className="w-1/2 px-3 py-2 bg-light border-2 border-dark"
          value={flexBox.selectValue}
          onChange={(e) => handleSelectChange(index, e.target.value)}
        >
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
          <option value="option3">Option 3</option>
        </select>
        <div class="content-center">
          <ChevronRightIcon className="w-5 h-5" />
        </div>
        <input
          type="text"
          className="w-1/2 px-3 py-2 bg-light border-2 border-dark"
          value={flexBox.inputValue}
          onChange={(e) => handleInputChange(index, e.target.value)}
        />
        {index !== flexBoxes.length - 1 && (
        <button
          className="text-red-500 ml-3"
          onClick={() => deleteFlexBox(index)}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        )}
        {index === flexBoxes.length - 1 && (
          <button
            className="text-dark ml-3"
            onClick={addFlexBox}
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      ))}
      <Button
        background="Pink"
        border="Dark"
        width="Full"
      >
        Confirm
      </Button>
    </div>
  );
};

export default WorkflowNodeForm;
