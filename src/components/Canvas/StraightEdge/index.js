import { BaseEdge, getSmoothStepPath } from 'reactflow';
 
export default function StraightEdge({ id, sourceX, sourceY, targetX, targetY }) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });
  const styles = {
    stroke: '#00FFFF',
    'strokeWidth': '3px',
  }
  return (
    <>
      <BaseEdge style={styles} className="w-16 !bg-teal-500" id={id} path={edgePath} />
    </>
  );
}