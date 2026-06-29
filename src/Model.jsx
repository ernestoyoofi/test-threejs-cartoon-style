import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, useGLTF, useAnimations, ContactShadows } from "@react-three/drei"
import { useEffect, useRef, useState, useCallback, Suspense, useMemo } from "react"
import * as THREE from "three"

const createOutlineMaterial = () => {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x444444,
    side: THREE.BackSide,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.outlineThickness = { value: 0.003 };
    shader.vertexShader = `
      uniform float outlineThickness;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      transformed += normal * outlineThickness;
      `
    );
  };
  return mat;
};

const outlineMaterial = createOutlineMaterial();

// List Public Model
const listFile = ["ShirokoModelTest.glb", "KeiModelTest.glb"]
// const basePath = location.host === "localhost:5173" ? "/" : "https://storage-yog04.yupibknpermen.my.id/3d-model-test-env/"
const basePath = location.host === "localhost:5173" ? "/" : "/test-threejs-cartoon-style/"

function ModelGlb({ modelFile }) {
  const group = useRef()
  const { scene, animations } = useGLTF(basePath + modelFile)
  const { actions } = useAnimations(animations, group)

  const toonGradientMap = useMemo(() => {
    const colors = new Uint8Array([110, 180, 210, 210]);
    // const colors = new Uint8Array([130, 180, 220, 255]);
    const map = new THREE.DataTexture(colors, colors.length, 1, THREE.RedFormat);
    map.minFilter = THREE.NearestFilter;
    map.magFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    map.needsUpdate = true;
    return map;
  }, [])

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && !child.isOutline) {
        // detected isFloor
        const isFloor = child.name.toLowerCase().includes('plane') || 
                        child.name.toLowerCase().includes('floor') || 
                        child.name.toLowerCase().includes('ground') ||
                        child.name.toLowerCase().includes('base')

        child.castShadow = !isFloor
        child.receiveShadow = true
        
        if (child.material) {
          // Switch to Toon Material (Cel Shading) only if it's not a floor, so that the floor's shading remains natural
          if (child.material.type !== 'MeshToonMaterial' && !isFloor) {
            const oldMat = child.material;
            child.material = new THREE.MeshToonMaterial({
              color: oldMat.color || new THREE.Color(0xffffff),
              map: oldMat.map,
              gradientMap: toonGradientMap,
              transparent: oldMat.transparent,
              opacity: oldMat.opacity,
              alphaTest: oldMat.alphaTest,
              side: oldMat.side,
            });
          }
          // Add an Outline effect - Skip if the object is a floor
          if (!child.userData.hasOutline && !isFloor) {
            let outlineMesh;
            
            if (child.isSkinnedMesh) {
              outlineMesh = new THREE.SkinnedMesh(child.geometry, outlineMaterial);
              outlineMesh.bind(child.skeleton, child.bindMatrix);
            } else {
              outlineMesh = new THREE.Mesh(child.geometry, outlineMaterial);
            }
            
            outlineMesh.isOutline = true;
            outlineMesh.castShadow = false;
            outlineMesh.receiveShadow = false;
            child.add(outlineMesh);
            
            child.userData.hasOutline = true;
          }
        }
      }
    })

    if (animations.length > 0 && actions) {
      const poseAction = actions[Object.keys(actions)[0]] 
      
      if (poseAction) {
        poseAction.reset()
        poseAction.setEffectiveWeight(1)
        poseAction.paused = true
        poseAction.play()
      }
    }
  }, [scene, animations, actions, toonGradientMap])

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} position={[0, 0, 0]} scale={[1, 1, 1]} />
    </group>
  )
}

function Fallback({ onRetry }) {
  return (
    <div style={{ position: "absolute", width: "100%", height: "100%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ marginBottom: "10px" }}>Error load 3d object</p>
        <button
          onClick={onRetry}
          style={{ padding: "8px 16px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
      <span>Load Model...</span>
    </div>
  )
}

function Scene({ modelFile }) {
  return (
    <>
      <color attach="background" args={["#919191"]} />
      
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[-2, 5, 5]} 
        intensity={1} 
        castShadow 
        shadow-bias={-0.0005}
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-3, 3, 3, -3, 0.1, 25]} />
      </directionalLight>
      <directionalLight position={[-5, 5, -5]} intensity={2.5} />
      
      <ModelGlb modelFile={modelFile} />
      
      <OrbitControls
        enablePan={false}
        enableDamping
        autoRotate
        autoRotateSpeed={1}
        target={[0, 1.4, 0]}
      />
    </>
  )
}

export default function Mesh3DObject() {
  const [error, setError] = useState(false)
  const [key, setKey] = useState(0)
  const [selectedModel, setSelectedModel] = useState(listFile[0])

  useEffect(() => {
    useGLTF.preload(basePath + listFile[0])
  }, [])

  const handleRetry = useCallback(() => {
    setError(false)
    setKey((k) => k + 1)
  }, [])

  const handleModelChange = useCallback((e) => {
    setSelectedModel(e.target.value)
    setError(false)
    setKey((k) => k + 1)
  }, [])

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <div className="absolute z-50 p-2 max-w-sm bg-white rounded-md text-sm">
        <p className="mb-2">All 3D models from the game Blue Archive are assets owned by Nexon, not by me, and I do not use them for commercial purposes; they are used solely for testing.</p>
        <select
          className="w-full bg-white outline-none p-2 py-1 border border-neutral-300 rounded-md"
          value={selectedModel}
          onChange={handleModelChange}
        >
          {listFile.map((item, key) => (
            <option key={key} value={item}>{item}</option>
          ))}
        </select>
      </div>
      {error ? (
        <Fallback onRetry={handleRetry} />
      ) : (
        <Suspense fallback={<Loader />}>
          <Canvas
            key={key}
            dpr={[1, 1.5]} 
            shadows
            gl={{
              antialias: true, 
              alpha: false, 
              powerPreference: "high-performance",
              toneMapping: THREE.LinearToneMapping,
              toneMappingExposure: 0.8
            }}
            camera={{ fov: 40, near: 1, far: 100, position: [4, 3, 0] }}
          >
            <Scene modelFile={selectedModel} />
          </Canvas>
        </Suspense>
      )}
    </div>
  )
}