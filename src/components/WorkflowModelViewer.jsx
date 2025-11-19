import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Center, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

const Model = ({ url, activeLayers, step }) => {
    const { scene } = useGLTF(url);
    const modelRef = useRef();

    // Clone scene to avoid mutating cached original if used elsewhere
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    // Store original materials to restore them later
    const originalMaterials = useMemo(() => {
        const mats = new Map();
        clonedScene.traverse((child) => {
            if (child.isMesh) {
                mats.set(child.uuid, child.material);
            }
        });
        return mats;
    }, [clonedScene]);

    // Wireframe material for the "abstract" phase
    const wireframeMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#00ff88',
        wireframe: true,
        transparent: true,
        opacity: 0.3
    }), []);

    // Apply layer visibility and material logic
    useEffect(() => {
        if (!clonedScene) return;

        clonedScene.traverse((child) => {
            if (child.isMesh) {
                const name = child.name.toLowerCase();
                let visible = true;

                // Layer Logic (Step 3)
                if (step === 3) {
                    if (activeLayers.core && !activeLayers.facade) {
                        // Show only core
                        if (name.includes('facade') || name.includes('glass') || name.includes('panel') || name.includes('mullion') || name.includes('window')) visible = false;
                    } else if (!activeLayers.core && activeLayers.facade) {
                        // Show only facade
                        if (name.includes('core') || name.includes('slab') || name.includes('wall') || name.includes('floor') || name.includes('column')) visible = false;
                        // Force facade visible if it was hidden by above logic (unlikely but safe)
                        if (name.includes('facade') || name.includes('glass') || name.includes('panel')) visible = true;
                    }
                }

                child.visible = visible;

                // Material Logic
                // Steps 0-2: Abstract Wireframe
                // Step 3: Mixed/Solid (Transitioning)
                // Step 4+: Full Realism
                if (step < 3) {
                    child.material = wireframeMaterial;
                } else {
                    // Restore original material
                    if (originalMaterials.has(child.uuid)) {
                        child.material = originalMaterials.get(child.uuid);
                    }
                }
            }
        });
    }, [clonedScene, activeLayers, step, originalMaterials, wireframeMaterial]);

    useFrame((state, delta) => {
        if (modelRef.current) {
            // Growth Animation (Step 1)
            const targetScale = step >= 1 ? 1 : 0;
            // Smooth lerp for scale
            // If step 1 (Generating), we want it to grow from 0
            if (step === 1) {
                // We can use time to animate growth
                // But since step changes, we might just lerp to 1
                modelRef.current.scale.y = THREE.MathUtils.lerp(modelRef.current.scale.y, 1, delta * 2);
                modelRef.current.scale.x = THREE.MathUtils.lerp(modelRef.current.scale.x, 1, delta * 2);
                modelRef.current.scale.z = THREE.MathUtils.lerp(modelRef.current.scale.z, 1, delta * 2);
            } else if (step === 0) {
                modelRef.current.scale.set(0, 0, 0);
            } else {
                // Ensure full scale for later steps
                modelRef.current.scale.set(1, 1, 1);
            }
        }
    });

    return <primitive object={clonedScene} ref={modelRef} />;
};

const WorkflowModelViewer = ({ step, activeLayers }) => {
    return (
        <div className="w-full h-full bg-black relative">
            <Canvas camera={{ position: [150, 100, 150], fov: 30 }} dpr={[1, 2]}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <Environment preset="city" />

                <Center>
                    <React.Suspense fallback={null}>
                        <Model url="/High_Rise-01.glb" activeLayers={activeLayers} step={step} />
                    </React.Suspense>
                </Center>

                {/* Auto-rotating camera for "turntable" effect */}
                <OrbitControls
                    autoRotate
                    autoRotateSpeed={step === 1 ? 10 : 2} // Fast spin during generation, slow otherwise
                    enableZoom={true}
                    minDistance={50}
                    maxDistance={300}
                    enablePan={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 2}
                />
            </Canvas>

            {/* Loading Overlay */}
            {step === 1 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative overflow-hidden p-[1px]">
                        <div className="absolute inset-[-100%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#22c55e_100%)]" />
                        <div className="relative bg-black px-4 py-2 text-xs font-mono text-green-500">
                            GENERATING GEOMETRY...
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkflowModelViewer;
