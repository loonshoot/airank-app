import WorkflowNodeForm from './WorkflowNodes/Transform';

const getForm = (formName, fieldValues) => {
  switch (formName) {
    case 'workflowNode':
      return <WorkflowNodeForm fieldValues={fieldValues} />;
    default:
      return null;
  }
};

export { getForm };
