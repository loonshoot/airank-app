import React, { useCallback } from 'react';
import Dagre from '@dagrejs/dagre';
import {
  ReactFlow,
  Panel,
  MiniMap,
  Controls,
  ControlButton,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  getOutgoers,
  useReactFlow,
  addEdge,
  fitView,
  getNode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TriggerNode from '@/components/Canvas/TriggerNode/index'; // Added import statement
import TransformNode from '@/components/Canvas/TransformNode/index'; // Added import statement
import IfThenOrNode from '@/components/Canvas/IfThenOrNode/index'; // Added import statement
import DestinationNode from '@/components/Canvas/DestinationNode/index'; // Added import statement
import AIAgentNode from '@/components/Canvas/AIAgentNode/index'; // Added import statement
import WebhookNode from '@/components/Canvas/WebhookNode/index'; // Added import statement
import ParserNode from '@/components/Canvas/ParserNode/index'; // Added import statement
import StraightEdge from '@/components/Canvas/StraightEdge/index'; // Added import statement
import { SparklesIcon } from '@heroicons/react/24/outline';

const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const nodeTypes = { 
  trigger: TriggerNode, 
  transformer: TransformNode, 
  destination: DestinationNode, 
  ifthenor: IfThenOrNode,
  'ai-agent': AIAgentNode,
  webhook: WebhookNode,
  parser: ParserNode
};
const edgeTypes = {
  default: StraightEdge,
  'straight': StraightEdge
}
const connectionLineStyle = { strokeWidth: 3, color: "#00FFFF" };
const connectionLineType = "step";

const getLayoutedElements = (nodes, edges, options) => {
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) => g.setNode(node.id, node));

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const { x, y } = g.node(node.id);

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

const LayoutFlow = ({ activeWorkflowItem, setActiveWorkflowItem, nodes, edges, setNodes, setEdges, workspace, workflowId, t, setUserInputted, userInputted }) => {
    
    const { fitView } = useReactFlow();

  const onNodesChange = useCallback(
    (changes) => {
        const nextChanges = changes.reduce((acc, change) => {
            if (change.type === 'remove') {
                const node = nodes.find((n) => n.id === change.id);
                setUserInputted(true);
                if (node && node.type === 'trigger') {
                    return acc;
                } else {
                    return [...acc, change];
                }
            } else {
                return [...acc, change];
            }
        }, []);

        setNodes((nds) => {
            const updatedNodes = applyNodeChanges(nextChanges, nds);
            console.log(updatedNodes)
            return updatedNodes;
        });
    },
    [workspace?.slug, workflowId, edges, nodes],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds);
        return updatedEdges;
      });
    },
    [workspace?.slug, workflowId, nodes],
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  const isValidConnection = useCallback(
    (connection) => {
      const target = nodes.find((node) => node.id === connection.target);
      const hasCycle = (node, visited = new Set()) => {
        if (visited.has(node.id)) return false;

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) return true;
          if (hasCycle(outgoer, visited)) return true;
        }
      };

      if (target.id === connection.source) return false;
      return !hasCycle(target);
    },
    [nodes, edges],
  );

  const onLayout = useCallback(
    (direction) => {
      const layouted = getLayoutedElements(nodes, edges, { direction });

      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);

      window.requestAnimationFrame(() => {
        fitView();
      });
    },
    [nodes, edges]
  );



  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      edgeTypes={edgeTypes}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      connectionLineStyle={connectionLineStyle}
      connectionLineType={connectionLineType}
      fitView
    >

      <MiniMap nodeStrokeWidth={3} zoomable pannable />
      <Controls className="text-dark">
        <ControlButton onClick={() => onLayout('TB')}>
        <SparklesIcon className="text-dark" />
        </ControlButton>
      </Controls>
      <Background color="#231747" variant="lines" />
    </ReactFlow>
  );
};

export default LayoutFlow;
