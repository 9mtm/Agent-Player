/**
 * Studio Scene - Built-in 3D Background
 * Photography/recording studio with professional lighting and backdrop
 * TODO: Implement full studio design with softboxes, cameras, and equipment
 */

export interface SceneProps {
  y: number; // Floor Y position
}

export function StudioScene({ y }: SceneProps) {
  return (
    <group>
      {/* Clean gray floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#808080" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* White backdrop */}
      <mesh position={[0, y + 2.5, -3.5]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.95} />
      </mesh>

      {/* Studio lighting - key light (front left) */}
      <pointLight position={[-3, y + 3, 2]} intensity={4} color="#ffffff" distance={10} decay={2} />

      {/* Fill light (front right) */}
      <pointLight position={[3, y + 3, 2]} intensity={2.5} color="#f0f0ff" distance={10} decay={2} />

      {/* Back light */}
      <pointLight position={[0, y + 3, -2]} intensity={3} color="#ffffee" distance={8} decay={2} />
    </group>
  );
}
