/**
 * Classroom Scene - Built-in 3D Background
 * Educational classroom environment with blackboard, teacher's desk, and student desks
 */

export interface SceneProps {
  y: number; // Floor Y position
}

export function ClassroomScene({ y }: SceneProps) {
  return (
    <group>
      {/* Floor - Wooden classroom floor (LARGE) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[20, 15]} />
        <meshStandardMaterial color="#d4a574" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Back wall - Light colored wall (LARGE) */}
      <mesh position={[0, y + 3.5, -6.5]} receiveShadow>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#e8dcc8" roughness={1} />
      </mesh>

      {/* Blackboard - EXTRA LARGE blackboard on back wall (shifted FAR RIGHT so avatar stands clearly to the LEFT, presenting) */}
      <group position={[5.0, y + 2.7, -6.4]}>
        {/* Blackboard surface - BIGGER */}
        <mesh castShadow>
          <boxGeometry args={[6.0, 3.0, 0.08]} />
          <meshStandardMaterial color="#1a2820" roughness={0.7} />
        </mesh>
        {/* Wooden frame - top */}
        <mesh position={[0, 1.55, 0]}>
          <boxGeometry args={[6.2, 0.1, 0.1]} />
          <meshStandardMaterial color="#5c3d1e" roughness={0.6} />
        </mesh>
        {/* Wooden frame - bottom */}
        <mesh position={[0, -1.55, 0]}>
          <boxGeometry args={[6.2, 0.1, 0.1]} />
          <meshStandardMaterial color="#5c3d1e" roughness={0.6} />
        </mesh>
        {/* Wooden frame - left */}
        <mesh position={[-3.05, 0, 0]}>
          <boxGeometry args={[0.1, 3.2, 0.1]} />
          <meshStandardMaterial color="#5c3d1e" roughness={0.6} />
        </mesh>
        {/* Wooden frame - right */}
        <mesh position={[3.05, 0, 0]}>
          <boxGeometry args={[0.1, 3.2, 0.1]} />
          <meshStandardMaterial color="#5c3d1e" roughness={0.6} />
        </mesh>
        {/* Chalk tray */}
        <mesh position={[0, -1.55, 0.09]} castShadow>
          <boxGeometry args={[6.0, 0.05, 0.15]} />
          <meshStandardMaterial color="#8b6f47" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}
