import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { ExtractionPhysicsEngine, MachineState } from '../utils/physicsEngine';
import { DonorProfile } from '../types';
import { soundManager } from '../utils/audio';
import { hapticManager } from '../utils/haptics';
import { Gauge, Droplet, Sparkles, Beaker } from 'lucide-react';

interface PhysicsViewportProps {
  engine: ExtractionPhysicsEngine;
  state: MachineState;
  activeDonor: DonorProfile;
  onManualStroke: (velocity: number) => void;
  vacuumPowerBonus: number;
  sleeveUpgradeLevel?: number;
  resonatorUpgradeLevel?: number;
  vacuumUpgradeLevel?: number;
  lubeTrigger?: number;
  vacuumTrigger?: number;
}

// Donor skin tone lookup table
const DONOR_SKIN_TONES: Record<string, { base: number; glans: number; roughness: number }> = {
  leo: { base: 0xd6a87e, glans: 0xeb8888, roughness: 0.32 },
  marcus: { base: 0x9a6544, glans: 0xb55e5e, roughness: 0.34 },
  alex: { base: 0xf5caa8, glans: 0xfb9292, roughness: 0.28 },
  thorne: { base: 0x543622, glans: 0x7c4538, roughness: 0.36 },
  jin: { base: 0xe8caa6, glans: 0xf09090, roughness: 0.30 },
};

export const PhysicsViewport: React.FC<PhysicsViewportProps> = ({
  engine,
  state,
  activeDonor,
  onManualStroke,
  vacuumPowerBonus,
  sleeveUpgradeLevel = 1,
  resonatorUpgradeLevel = 0,
  vacuumUpgradeLevel = 1,
  lubeTrigger = 0,
  vacuumTrigger = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interaction tracking refs for 1:1 thumb slide tracking
  const isDragging = useRef<boolean>(false);
  const lastTouchY = useRef<number | null>(null);
  const lastTouchTime = useRef<number>(0);
  const strokeTravelAccumulator = useRef<number>(0);

  // HUD state
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudVolume, setHudVolume] = useState<number>(0);
  const [hudSurge, setHudSurge] = useState<boolean>(false);
  const [showLubeToast, setShowLubeToast] = useState<boolean>(false);
  const [showVacuumToast, setShowVacuumToast] = useState<boolean>(false);

  // Trigger tracking refs
  const lastLubeTriggerRef = useRef<number>(lubeTrigger);
  const lastVacuumTriggerRef = useRef<number>(vacuumTrigger);
  const lubeSlatherStartTimeRef = useRef<number>(0);
  const lubeToastTimeoutRef = useRef<number | null>(null);
  const vacuumToastTimeoutRef = useRef<number | null>(null);

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Animated 3D mesh refs
  const penisGroupRef = useRef<THREE.Group | null>(null);
  const shaftMeshRef = useRef<THREE.Mesh | null>(null);
  const glansGroupRef = useRef<THREE.Group | null>(null);
  const scrotumGroupRef = useRef<THREE.Group | null>(null);
  const strokerGroupRef = useRef<THREE.Group | null>(null);
  const beakerGroupRef = useRef<THREE.Group | null>(null);
  const beakerFluidMeshRef = useRef<THREE.Mesh | null>(null);
  const meniscusMeshRef = useRef<THREE.Mesh | null>(null);
  const frothMeshRef = useRef<THREE.Mesh | null>(null);
  const meatusPearlMeshRef = useRef<THREE.Mesh | null>(null);
  const skinMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const glansMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  // Thick clear lube visual refs
  const lubeGelMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const shaftLubeMeshRef = useRef<THREE.Mesh | null>(null);
  const glansLubeMeshRef = useRef<THREE.Mesh | null>(null);
  const coronaLubeMeshRef = useRef<THREE.Mesh | null>(null);
  const lubeStreamMeshRef = useRef<THREE.Mesh | null>(null);
  const slatherWaveMeshRef = useRef<THREE.Mesh | null>(null);
  const lubeDripsRef = useRef<{
    mesh: THREE.Mesh;
    angle: number;
    baseY: number;
    currentY: number;
    speed: number;
    active: boolean;
  }[]>([]);

  // Titanium vacuum collar refs
  const topCollarMeshRef = useRef<THREE.Mesh | null>(null);
  const bottomCollarMeshRef = useRef<THREE.Mesh | null>(null);
  const centerRingMeshRef = useRef<THREE.Mesh | null>(null);

  // 3D Physical Viscous Semen Globs Engine (Organic projectiles flying in parabolic arcs from meatus to cup)
  const globPoolRef = useRef<{
    mesh: THREE.Mesh;
    active: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    scale: number;
    life: number;
  }[]>([]);

  // Expanding Surface Splash Rings on Beaker Liquid
  const splashPoolRef = useRef<{
    mesh: THREE.Mesh;
    active: boolean;
    scale: number;
    opacity: number;
    y: number;
  }[]>([]);

  const dripCadenceTimerRef = useRef<number>(0);
  const lastStrokeCountRef = useRef<number>(state.manualStrokes || 0);

  // Semen gooey spray particle system refs
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const particleDataRef = useRef<{
    positions: Float32Array;
    velocities: Float32Array;
    lifetimes: Float32Array;
    active: boolean[];
    count: number;
  } | null>(null);

  // Eject thick, pearlescent viscous 3D globs directly from cock glans meatus into collection cup
  const launchViscousGlobs = useCallback((count: number = 2, velocityScale: number = 1.0) => {
    const pool = globPoolRef.current;
    if (!pool || pool.length === 0) return;
    let spawned = 0;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      if (!pool[i].active) {
        pool[i].active = true;
        // Start directly at the exposed urethral meatus opening of the glans
        pool[i].x = -1.45 + (Math.random() - 0.5) * 0.06;
        pool[i].y = 2.45 + (Math.random() - 0.5) * 0.06;
        pool[i].z = 0.05 + (Math.random() - 0.5) * 0.06;

        // Graceful projectile arc forward-right directly toward the beaker cup mouth
        const fwd = (3.5 + Math.random() * 2.2) * velocityScale;
        const up = (1.4 + Math.random() * 2.0) * velocityScale;
        const depth = ((Math.random() - 0.5) * 0.35 + 0.35) * velocityScale;

        pool[i].vx = fwd;
        pool[i].vy = up;
        pool[i].vz = depth;
        pool[i].scale = (0.13 + Math.random() * 0.08) * (0.9 + Math.min(0.6, velocityScale * 0.2));
        pool[i].life = 1.8;
        pool[i].mesh.visible = true;
        pool[i].mesh.position.set(pool[i].x, pool[i].y, pool[i].z);
        pool[i].mesh.scale.set(pool[i].scale, pool[i].scale, pool[i].scale);

        spawned++;
      }
    }

    // Dynamic expansion & eruption reflex on the glistening urethral meatus pearl
    if (meatusPearlMeshRef.current) {
      meatusPearlMeshRef.current.scale.set(0.38, 0.85, 0.38);
    }
  }, []);

  // Launch explosive gooey spray clouds & projectile globs directly from urethral meatus into collection beaker
  const launchSpecimenBurst = useCallback((count: number, velocityScale: number = 1.0) => {
    // 1. Concurrently launch thick 3D gelatinous globs
    const globsToLaunch = Math.max(1, Math.min(6, Math.floor(count * 0.35)));
    launchViscousGlobs(globsToLaunch, velocityScale);

    // 2. Launch high-speed gooey spray mist and droplet cone
    const pData = particleDataRef.current;
    if (!pData) return;

    const { positions, velocities, lifetimes, active, count: maxParticles } = pData;
    let launched = 0;

    for (let i = 0; i < maxParticles && launched < count; i++) {
      if (!active[i]) {
        active[i] = true;
        lifetimes[i] = 1.3 + Math.random() * 0.5;

        // Direct urethral ejection from glans tip meatus
        positions[i * 3] = -1.45 + (Math.random() - 0.5) * 0.08;
        positions[i * 3 + 1] = 2.45 + (Math.random() - 0.5) * 0.08;
        positions[i * 3 + 2] = 0.05 + (Math.random() - 0.5) * 0.08;

        // Arcing high-velocity forward-upward gooey spray cone aimed directly toward the beaker rim
        const forwardSpeed = (3.6 + Math.random() * 2.4) * velocityScale;
        const upwardSpeed = (1.5 + Math.random() * 2.4) * velocityScale;
        const depthDrift = ((Math.random() - 0.5) * 0.45 + 0.35) * velocityScale;

        velocities[i * 3] = forwardSpeed;
        velocities[i * 3 + 1] = upwardSpeed;
        velocities[i * 3 + 2] = depthDrift;

        launched++;
      }
    }
  }, [launchViscousGlobs]);

  // Initialize Three.js Scene, Camera, Lighting & Anatomical Models
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 360;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.022);

    // 2. CAMERA SETUP (Framing both the shaft on left and the beaker on right)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0.15, 0.35, 11.4);
    camera.lookAt(0.15, -0.05, 0);
    cameraRef.current = camera;

    // 3. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. LIGHTING SETUP
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.4);
    scene.add(ambientLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    keyLight.position.set(4, 6, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Laboratory Blue Rim Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.8);
    rimLight.position.set(-6, 3, -4);
    scene.add(rimLight);

    // Clinical Bottom Uplight
    const bottomLight = new THREE.PointLight(0x0284c7, 1.2, 10);
    bottomLight.position.set(0, -4, 3);
    scene.add(bottomLight);

    // Illuminated Beaker Spot Light
    const beakerLight = new THREE.PointLight(0x67e8f9, 2.4, 8);
    beakerLight.position.set(1.8, 1.8, 2.2);
    scene.add(beakerLight);

    // 5. ANATOMICAL MODEL (Positioned on the left side: X = -1.45)
    const skinTone = DONOR_SKIN_TONES[activeDonor.id] || DONOR_SKIN_TONES.leo;
    const penisGroup = new THREE.Group();
    penisGroup.position.set(-1.45, -0.2, 0);
    penisGroupRef.current = penisGroup;
    scene.add(penisGroup);

    // Skin Material
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: skinTone.base,
      roughness: skinTone.roughness,
      metalness: 0.05,
      clearcoat: 0.45,
      clearcoatRoughness: 0.15,
      subsurface: 0.4,
    } as any);
    skinMaterialRef.current = skinMat;

    // Glans Material
    const glansMat = new THREE.MeshPhysicalMaterial({
      color: skinTone.glans,
      roughness: Math.max(0.1, skinTone.roughness - 0.12),
      metalness: 0.04,
      clearcoat: 0.65,
      clearcoatRoughness: 0.1,
      emissive: 0x000000,
    } as any);
    glansMaterialRef.current = glansMat;

    // Shaft Geometry
    const shaftHeight = 4.0;
    const shaftRadius = 0.68;
    const shaftGeo = new THREE.CylinderGeometry(shaftRadius * 0.94, shaftRadius * 1.06, shaftHeight, 32, 16);
    const shaftMesh = new THREE.Mesh(shaftGeo, skinMat);
    shaftMesh.castShadow = true;
    shaftMesh.receiveShadow = true;
    shaftMeshRef.current = shaftMesh;
    penisGroup.add(shaftMesh);

    // Glans Head & Corona
    const glansGroup = new THREE.Group();
    glansGroup.position.y = shaftHeight / 2 + 0.12;
    glansGroupRef.current = glansGroup;
    penisGroup.add(glansGroup);

    const coronaGeo = new THREE.TorusGeometry(shaftRadius * 1.05, 0.16, 16, 32);
    const coronaMesh = new THREE.Mesh(coronaGeo, glansMat);
    coronaMesh.rotation.x = Math.PI / 2;
    glansGroup.add(coronaMesh);

    const glansCapGeo = new THREE.SphereGeometry(shaftRadius * 1.08, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const glansCapMesh = new THREE.Mesh(glansCapGeo, glansMat);
    glansCapMesh.position.y = 0.05;
    glansCapMesh.castShadow = true;
    glansGroup.add(glansCapMesh);

    // Meatus Slit
    const meatusGeo = new THREE.BoxGeometry(0.04, 0.22, 0.02);
    const meatusMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    const meatusMesh = new THREE.Mesh(meatusGeo, meatusMat);
    meatusMesh.position.set(0, 0.58, 0.02);
    glansGroup.add(meatusMesh);

    // 3D Viscous Semen Droplet / Pearl at Meatus Tip (Glistens and swells with arousal)
    const meatusPearlGeo = new THREE.SphereGeometry(0.14, 20, 20);
    const meatusPearlMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xffffff),
      metalness: 0.0,
    });
    const meatusPearlMesh = new THREE.Mesh(meatusPearlGeo, meatusPearlMat);
    meatusPearlMesh.position.set(0, 0.62, 0.04);
    meatusPearlMesh.scale.set(0.15, 0.15, 0.15);
    glansGroup.add(meatusPearlMesh);
    meatusPearlMeshRef.current = meatusPearlMesh;

    // Glistening Coronal Secretion Ring
    const coronaDewGeo = new THREE.TorusGeometry(shaftRadius * 1.06, 0.035, 12, 32);
    const coronaDewMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.06,
      clearcoat: 1.0,
      transmission: 0.15,
      opacity: 0.95,
      transparent: true,
    });
    const coronaDewMesh = new THREE.Mesh(coronaDewGeo, coronaDewMat);
    coronaDewMesh.rotation.x = Math.PI / 2;
    coronaDewMesh.position.y = 0.02;
    glansGroup.add(coronaDewMesh);

    // THICK CLEAR SILICONE LUBRICANT SYSTEM (Visible wet gel layer on shaft & glans, slather stream, slather wave)
    const lubeGelMat = new THREE.MeshPhysicalMaterial({
      color: 0xecfeff,
      transmission: 0.94,
      transparent: true,
      opacity: 0.9,
      roughness: 0.02,
      metalness: 0.0,
      ior: 1.48,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      thickness: 0.8,
      depthWrite: false,
    });
    lubeGelMaterialRef.current = lubeGelMat;

    // Shaft clear lube sheath
    const shaftLubeGeo = new THREE.CylinderGeometry(shaftRadius * 0.965, shaftRadius * 1.075, shaftHeight * 1.01, 32, 16);
    const shaftLubeMesh = new THREE.Mesh(shaftLubeGeo, lubeGelMat);
    shaftLubeMesh.position.y = 0;
    penisGroup.add(shaftLubeMesh);
    shaftLubeMeshRef.current = shaftLubeMesh;

    // Glans cap clear lube layer
    const glansLubeGeo = new THREE.SphereGeometry(shaftRadius * 1.10, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.49);
    const glansLubeMesh = new THREE.Mesh(glansLubeGeo, lubeGelMat);
    glansLubeMesh.position.y = 0.05;
    glansGroup.add(glansLubeMesh);
    glansLubeMeshRef.current = glansLubeMesh;

    // Corona ridge clear lube pool
    const coronaLubeGeo = new THREE.TorusGeometry(shaftRadius * 1.075, 0.175, 16, 32);
    const coronaLubeMesh = new THREE.Mesh(coronaLubeGeo, lubeGelMat);
    coronaLubeMesh.rotation.x = Math.PI / 2;
    glansGroup.add(coronaLubeMesh);
    coronaLubeMeshRef.current = coronaLubeMesh;

    // Slathering Gel Wave Ring (Wipes down the shaft when lube button pressed)
    const slatherWaveGeo = new THREE.TorusGeometry(shaftRadius * 1.14, 0.22, 16, 32);
    const slatherWaveMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transmission: 0.92,
      roughness: 0.02,
      transparent: true,
      opacity: 0,
      clearcoat: 1.0,
      ior: 1.48,
      depthWrite: false,
    });
    const slatherWaveMesh = new THREE.Mesh(slatherWaveGeo, slatherWaveMat);
    slatherWaveMesh.rotation.x = Math.PI / 2;
    slatherWaveMesh.visible = false;
    penisGroup.add(slatherWaveMesh);
    slatherWaveMeshRef.current = slatherWaveMesh;

    // Thick Gel Droplets Pool (Organic beads of clear gel that run down the shaft)
    const lubeDrips: { mesh: THREE.Mesh; angle: number; baseY: number; currentY: number; speed: number; active: boolean }[] = [];
    for (let i = 0; i < 12; i++) {
      const dripGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 16, 16);
      dripGeo.scale(1, 1.4, 0.9);
      const dripMesh = new THREE.Mesh(dripGeo, lubeGelMat);
      dripMesh.visible = false;
      penisGroup.add(dripMesh);
      lubeDrips.push({
        mesh: dripMesh,
        angle: (i / 12) * Math.PI * 2 + Math.random() * 0.3,
        baseY: 2.1 - Math.random() * 0.5,
        currentY: 2.1,
        speed: 0.85 + Math.random() * 0.7,
        active: false,
      });
    }
    lubeDripsRef.current = lubeDrips;

    // Dispenser squirt stream arc (Shoots from upper-left nozzle onto glans)
    const squirtCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.8, 3.8, 1.2),
      new THREE.Vector3(-1.6, 3.2, 0.8),
      new THREE.Vector3(-1.48, 2.55, 0.35),
    ]);
    const lubeStreamGeo = new THREE.TubeGeometry(squirtCurve, 24, 0.09, 12, false);
    const lubeStreamMat = new THREE.MeshPhysicalMaterial({
      color: 0xecfeff,
      transmission: 0.92,
      roughness: 0.02,
      transparent: true,
      opacity: 0,
      clearcoat: 1.0,
      ior: 1.48,
      depthWrite: false,
    });
    const lubeStreamMesh = new THREE.Mesh(lubeStreamGeo, lubeStreamMat);
    lubeStreamMesh.visible = false;
    scene.add(lubeStreamMesh);
    lubeStreamMeshRef.current = lubeStreamMesh;

    // ANCHORED SCROTUM / TESTICLES (Anchored at base Y = -2.85, completely stationary)
    const scrotumGroup = new THREE.Group();
    scrotumGroup.position.set(0, -shaftHeight / 2 - 0.45, -0.15);
    scrotumGroupRef.current = scrotumGroup;
    penisGroup.add(scrotumGroup);

    const testisGeo = new THREE.SphereGeometry(0.72, 24, 24);
    const leftTestis = new THREE.Mesh(testisGeo, skinMat);
    leftTestis.position.set(-0.52, -0.1, 0);
    leftTestis.scale.set(0.9, 1.15, 0.95);
    leftTestis.castShadow = true;
    scrotumGroup.add(leftTestis);

    const rightTestis = new THREE.Mesh(testisGeo, skinMat);
    rightTestis.position.set(0.52, -0.22, 0);
    rightTestis.scale.set(0.92, 1.18, 0.96);
    rightTestis.castShadow = true;
    scrotumGroup.add(rightTestis);

    // 6. THE MECHANICAL VACUUM STROKER SLEEVE (Moves directly with strokes and clicks)
    const strokerGroup = new THREE.Group();
    const initialStrokerY = 1.95 - state.strokePosition * 3.9;
    strokerGroup.position.set(0, initialStrokerY, 0);
    strokerGroupRef.current = strokerGroup;
    penisGroup.add(strokerGroup);

    // Transparent Contoured Medical Silicone Sleeve Cylinder
    const sleeveLength = 1.95;
    const sleeveGeo = new THREE.CylinderGeometry(shaftRadius * 1.30, shaftRadius * 1.26, sleeveLength, 32, 12, true);
    const sleeveMat = new THREE.MeshPhysicalMaterial({
      color: sleeveUpgradeLevel > 2 ? 0x06b6d4 : 0x38bdf8,
      transmission: 0.75,
      opacity: 0.90,
      transparent: true,
      roughness: 0.10,
      ior: 1.44,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      thickness: 0.6,
    });
    const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    strokerGroup.add(sleeveMesh);

    // Lubricant Glaze Sheen Layer (shimmering between sleeve and shaft)
    const lubeLayerGeo = new THREE.CylinderGeometry(shaftRadius * 1.16, shaftRadius * 1.14, sleeveLength * 0.94, 32, 1, true);
    const lubeLayerMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
      roughness: 0.03,
      clearcoat: 1.0,
    });
    const lubeLayerMesh = new THREE.Mesh(lubeLayerGeo, lubeLayerMat);
    strokerGroup.add(lubeLayerMesh);

    // Top Polished Titanium Vacuum Collar Ring
    const collarGeo = new THREE.TorusGeometry(shaftRadius * 1.30, 0.055, 16, 32);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.18,
    });
    const topCollarMesh = new THREE.Mesh(collarGeo, collarMat);
    topCollarMesh.position.y = sleeveLength / 2;
    topCollarMesh.rotation.x = Math.PI / 2;
    strokerGroup.add(topCollarMesh);
    topCollarMeshRef.current = topCollarMesh;

    // Bottom Polished Titanium Vacuum Collar Ring
    const bottomCollarMesh = new THREE.Mesh(collarGeo, collarMat);
    bottomCollarMesh.position.y = -sleeveLength / 2;
    bottomCollarMesh.rotation.x = Math.PI / 2;
    strokerGroup.add(bottomCollarMesh);
    bottomCollarMeshRef.current = bottomCollarMesh;

    // Glowing Neon Center Status Ring
    const centerRingGeo = new THREE.TorusGeometry(shaftRadius * 1.33, 0.03, 12, 32);
    const centerRingMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const centerRingMesh = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRingMesh.rotation.x = Math.PI / 2;
    strokerGroup.add(centerRingMesh);
    centerRingMeshRef.current = centerRingMesh;

    // Internal Textured Rib Rings
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0e7490,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      metalness: 0.2,
    });
    [-0.65, -0.35, 0, 0.35, 0.65].forEach((yPos) => {
      const ribGeo = new THREE.TorusGeometry(shaftRadius * 1.15, 0.045, 12, 32);
      const ribMesh = new THREE.Mesh(ribGeo, ribMat);
      ribMesh.position.y = yPos;
      ribMesh.rotation.x = Math.PI / 2;
      strokerGroup.add(ribMesh);
    });

    // Automated High-Precision Robotic Vacuum Carriage (Motorized clinical extraction sleeve apparatus)
    const roboticCarriage = new THREE.Group();
    strokerGroup.add(roboticCarriage);

    const housingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.12,
    });
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });

    // Dual Linear Motor Actuator Housings on the flanks
    [-shaftRadius * 1.35, shaftRadius * 1.35].forEach((xSide) => {
      // Actuator body
      const actuatorGeo = new THREE.BoxGeometry(0.24, sleeveLength * 0.82, 0.46);
      const actuatorMesh = new THREE.Mesh(actuatorGeo, housingMat);
      actuatorMesh.position.set(xSide, 0, 0);
      actuatorMesh.castShadow = true;
      roboticCarriage.add(actuatorMesh);

      // Embedded pulsing cyan LED indicator strip
      const ledGeo = new THREE.BoxGeometry(0.03, sleeveLength * 0.74, 0.08);
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(xSide + (xSide > 0 ? 0.12 : -0.12), 0, 0);
      roboticCarriage.add(ledMesh);

      // Vertical polished chrome linear slide guide rails
      const guideGeo = new THREE.CylinderGeometry(0.038, 0.038, sleeveLength * 1.08, 16);
      const guideMesh = new THREE.Mesh(guideGeo, railMat);
      guideMesh.position.set(xSide, 0, 0.26);
      roboticCarriage.add(guideMesh);

      // Vacuum Pneumatic Quick-Release Fitting
      const fittingGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.22, 16);
      const fittingMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.75, roughness: 0.25 });
      const fittingMesh = new THREE.Mesh(fittingGeo, fittingMat);
      fittingMesh.position.set(xSide, 0.35, -0.25);
      fittingMesh.rotation.x = Math.PI / 2;
      roboticCarriage.add(fittingMesh);
    });

    // 7. 3D PROJECTILE VISCOUS SEMEN GLOBS ENGINE
    // Globs and gooey sprays shoot organically from cock glans meatus in arcing projectile parabolas directly into the collection cup
    const globMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0.96,
      transmission: 0.06,
      ior: 1.48,
    });
    const globGeo = new THREE.SphereGeometry(0.13, 16, 16);

    const globPool: {
      mesh: THREE.Mesh;
      active: boolean;
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      scale: number;
      life: number;
    }[] = [];

    for (let g = 0; g < 32; g++) {
      const gMesh = new THREE.Mesh(globGeo, globMat);
      gMesh.visible = false;
      scene.add(gMesh);
      globPool.push({
        mesh: gMesh,
        active: false,
        x: -1.45,
        y: 2.45,
        z: 0.05,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 0.13,
        life: 0,
      });
    }
    globPoolRef.current = globPool;

    // Pool of 12 Surface Splash Ripple Rings on the Beaker Liquid
    const splashPool: {
      mesh: THREE.Mesh;
      active: boolean;
      scale: number;
      opacity: number;
      y: number;
    }[] = [];
    const rippleGeo = new THREE.RingGeometry(0.04, 0.12, 24);
    for (let r = 0; r < 12; r++) {
      const rippleMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
      rippleMesh.rotation.x = Math.PI / 2;
      rippleMesh.visible = false;
      scene.add(rippleMesh);
      splashPool.push({
        mesh: rippleMesh,
        active: false,
        scale: 0.1,
        opacity: 0,
        y: -1.5,
      });
    }
    splashPoolRef.current = splashPool;

    // 8. 3D GRADUATED SPECIMEN COLLECTION CUP / BEAKER (Positioned on the right: X = 1.75, angled to catch projectile globs & sprays)
    const beakerGroup = new THREE.Group();
    beakerGroup.position.set(1.75, -0.65, 0.45);
    beakerGroup.rotation.z = -0.09; // Angled slightly towards the cock to naturally catch globs
    beakerGroupRef.current = beakerGroup;
    scene.add(beakerGroup);

    // Borosilicate Laboratory Glass Cylinder
    const beakerGeo = new THREE.CylinderGeometry(1.22, 1.08, 3.2, 32, 1, true);
    const beakerGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transmission: 0.88,
      transparent: true,
      opacity: 0.94,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      ior: 1.52,
    });
    const beakerMesh = new THREE.Mesh(beakerGeo, beakerGlassMat);
    beakerMesh.castShadow = true;
    beakerGroup.add(beakerMesh);

    // Glass Rim Ring with pouring spout
    const rimGeo = new THREE.TorusGeometry(1.22, 0.08, 16, 32);
    const rimMesh = new THREE.Mesh(rimGeo, beakerGlassMat);
    rimMesh.position.y = 1.6;
    rimMesh.rotation.x = Math.PI / 2;
    beakerGroup.add(rimMesh);

    // Glass Base Bottom
    const baseGeo = new THREE.CylinderGeometry(1.08, 1.08, 0.16, 32);
    const baseMesh = new THREE.Mesh(baseGeo, beakerGlassMat);
    baseMesh.position.y = -1.6;
    beakerGroup.add(baseMesh);

    // Graduated Measurement Markings on the glass (10mL, 20mL, 30mL, 40mL, 50mL)
    const markYOffsets = [
      { y: -1.1, label: '10' },
      { y: -0.5, label: '20' },
      { y: 0.1, label: '30' },
      { y: 0.7, label: '40' },
      { y: 1.3, label: '50' },
    ];
    markYOffsets.forEach(({ y }) => {
      const markGeo = new THREE.TorusGeometry(1.16 + (y / 3.2) * 0.1, 0.022, 8, 32);
      const markMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
      });
      const markMesh = new THREE.Mesh(markGeo, markMat);
      markMesh.position.y = y;
      markMesh.rotation.x = Math.PI / 2;
      beakerGroup.add(markMesh);
    });

    // Laboratory Stand Bracket
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });
    const standRingGeo = new THREE.TorusGeometry(1.28, 0.09, 12, 32);
    const standRingMesh = new THREE.Mesh(standRingGeo, standMat);
    standRingMesh.position.y = -0.7;
    standRingMesh.rotation.x = Math.PI / 2;
    beakerGroup.add(standRingMesh);

    const standRodGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.4, 16);
    const standRodMesh = new THREE.Mesh(standRodGeo, standMat);
    standRodMesh.position.set(1.4, -0.4, 0);
    beakerGroup.add(standRodMesh);

    // 3D SEMEN LIQUID SPECIMEN INSIDE THE BEAKER (Opaque, rich, pearlescent milky white)
    const fluidMaxHeight = 2.8;
    const fluidGeo = new THREE.CylinderGeometry(1.15, 1.04, fluidMaxHeight, 32);
    const fluidMat = new THREE.MeshPhysicalMaterial({
      color: 0xfdfdfd,
      roughness: 0.08,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xffffff),
      transparent: false, // Solid and completely visible through the glass beaker
    });
    const beakerFluidMesh = new THREE.Mesh(fluidGeo, fluidMat);
    beakerFluidMesh.position.y = -1.6 + 0.1;
    beakerFluidMesh.scale.set(1, 0.08, 1);
    beakerFluidMeshRef.current = beakerFluidMesh;
    beakerGroup.add(beakerFluidMesh);

    // Glistening Meniscus Cap on top of the fluid column
    const meniscusGeo = new THREE.CylinderGeometry(1.17, 1.15, 0.06, 32);
    const meniscusMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xffffff),
    });
    const meniscusMesh = new THREE.Mesh(meniscusGeo, meniscusMat);
    meniscusMesh.position.y = -1.5;
    meniscusMeshRef.current = meniscusMesh;
    beakerGroup.add(meniscusMesh);

    // Specimen Froth / Bubbles Ring along the glass perimeter
    const frothGeo = new THREE.TorusGeometry(1.14, 0.06, 12, 32);
    const frothMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
    });
    const frothMesh = new THREE.Mesh(frothGeo, frothMat);
    frothMesh.rotation.x = Math.PI / 2;
    frothMesh.position.y = -1.48;
    frothMeshRef.current = frothMesh;
    beakerGroup.add(frothMesh);

    // 9. PARTICLE SYSTEM FOR PHYSICAL SEMEN SPURTS & STREAMS
    const particleCount = 1200;
    const pPositions = new Float32Array(particleCount * 3);
    const pVelocities = new Float32Array(particleCount * 3);
    const pLifetimes = new Float32Array(particleCount);
    const pActive = new Array(particleCount).fill(false);

    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = 0;
      pPositions[i * 3 + 1] = -1000;
      pPositions[i * 3 + 2] = 0;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    // High-Definition Milky Fluid Droplet Texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 128;
    pCanvas.height = 128;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      // 1. Soft glowing outer rim
      const grad = pCtx.createRadialGradient(64, 64, 4, 64, 64, 58);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.98)');
      grad.addColorStop(0.72, 'rgba(242, 246, 255, 0.90)');
      grad.addColorStop(0.88, 'rgba(225, 238, 252, 0.50)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      pCtx.fillStyle = grad;
      pCtx.beginPath();
      pCtx.arc(64, 64, 58, 0, Math.PI * 2);
      pCtx.fill();

      // 2. High-gloss specular highlight glint
      pCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      pCtx.beginPath();
      pCtx.ellipse(48, 46, 14, 8, -Math.PI / 4, 0, Math.PI * 2);
      pCtx.fill();
    }
    const pTex = new THREE.CanvasTexture(pCanvas);

    const pMat = new THREE.PointsMaterial({
      size: 1.15,
      map: pTex,
      transparent: true,
      opacity: 0.98,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(pGeo, pMat);
    scene.add(particleSystem);
    particleSystemRef.current = particleSystem;
    particleDataRef.current = {
      positions: pPositions,
      velocities: pVelocities,
      lifetimes: pLifetimes,
      active: pActive,
      count: particleCount,
    };

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [activeDonor.id, sleeveUpgradeLevel]);

  // Trigger listener for Lube Slathering button
  useEffect(() => {
    if (lubeTrigger !== undefined && lubeTrigger > lastLubeTriggerRef.current) {
      lastLubeTriggerRef.current = lubeTrigger;
      lubeSlatherStartTimeRef.current = performance.now();
      setShowLubeToast(true);
      if (lubeToastTimeoutRef.current) clearTimeout(lubeToastTimeoutRef.current);
      lubeToastTimeoutRef.current = window.setTimeout(() => setShowLubeToast(false), 2600);

      // Re-seed clear gel droplets across glans and upper shaft to slide down
      if (lubeDripsRef.current) {
        lubeDripsRef.current.forEach((drip, idx) => {
          drip.active = true;
          drip.baseY = 2.15 - Math.random() * 0.45;
          drip.currentY = drip.baseY;
          drip.speed = 0.95 + Math.random() * 0.8;
          drip.angle = (idx / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          if (drip.mesh) {
            drip.mesh.visible = true;
          }
        });
      }
    }
  }, [lubeTrigger]);

  // Trigger listener for Vacuum Pump button
  useEffect(() => {
    if (vacuumTrigger !== undefined && vacuumTrigger > lastVacuumTriggerRef.current) {
      lastVacuumTriggerRef.current = vacuumTrigger;
      setShowVacuumToast(true);
      if (vacuumToastTimeoutRef.current) clearTimeout(vacuumToastTimeoutRef.current);
      vacuumToastTimeoutRef.current = window.setTimeout(() => setShowVacuumToast(false), 2200);
    }
  }, [vacuumTrigger]);

  // Main Render Loop (Smooth visuals, 1:1 sync, particle physics, semen cup update)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let burstTimer = 0;

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      // 1. Thick clear silicone lube coating & slather dynamic simulation
      const lubeRatio = Math.min(1.0, Math.max(0, state.lubeLevel / 100));
      if (lubeGelMaterialRef.current) {
        lubeGelMaterialRef.current.opacity = Math.max(0.12, lubeRatio * 0.94);
        lubeGelMaterialRef.current.thickness = 0.35 + lubeRatio * 0.7;
        lubeGelMaterialRef.current.roughness = Math.max(0.015, 0.09 - lubeRatio * 0.075);
        if (shaftLubeMeshRef.current) shaftLubeMeshRef.current.visible = lubeRatio > 0.05;
        if (glansLubeMeshRef.current) glansLubeMeshRef.current.visible = lubeRatio > 0.05;
        if (coronaLubeMeshRef.current) coronaLubeMeshRef.current.visible = lubeRatio > 0.05;
      }

      // Slathering Squirt & Wave Dynamics (When lube button is pressed)
      const slatherElapsed = (now - lubeSlatherStartTimeRef.current) / 1000;
      if (slatherElapsed < 1.4) {
        const slatherProgress = slatherElapsed / 1.4;

        // A. Dispenser squirt stream arc (nozzle to glans)
        if (lubeStreamMeshRef.current) {
          if (slatherProgress < 0.45) {
            lubeStreamMeshRef.current.visible = true;
            const streamMat = lubeStreamMeshRef.current.material as THREE.MeshPhysicalMaterial;
            streamMat.opacity = Math.sin((slatherProgress / 0.45) * Math.PI) * 0.95;
            const ripple = 1.0 + 0.22 * Math.sin(slatherProgress * 32);
            lubeStreamMeshRef.current.scale.set(ripple, ripple, ripple);
          } else {
            lubeStreamMeshRef.current.visible = false;
          }
        }

        // B. Clear gel slather wave wiping down the cock
        if (slatherWaveMeshRef.current) {
          slatherWaveMeshRef.current.visible = true;
          // Sweep from glans Y = 2.4 down to Y = -1.9
          const waveY = 2.4 - slatherProgress * 4.3;
          slatherWaveMeshRef.current.position.y = waveY;
          const waveMat = slatherWaveMeshRef.current.material as THREE.MeshPhysicalMaterial;
          waveMat.opacity = Math.sin(slatherProgress * Math.PI) * 0.92;
          const waveWobble = 1.0 + 0.07 * Math.sin(slatherProgress * Math.PI * 3);
          slatherWaveMeshRef.current.scale.set(waveWobble, waveWobble, 1.0);
        }

        // C. Thick clear gel drops sliding down the shaft
        if (lubeDripsRef.current) {
          const shaftRadius = 0.68;
          lubeDripsRef.current.forEach((drip) => {
            if (drip.mesh) {
              drip.mesh.visible = true;
              drip.currentY = drip.baseY - Math.pow(slatherProgress, 1.15) * drip.speed * 2.8;
              const dripRad = shaftRadius * 1.05;
              drip.mesh.position.set(
                Math.cos(drip.angle) * dripRad,
                drip.currentY,
                Math.sin(drip.angle) * dripRad
              );
            }
          });
        }
      } else {
        if (lubeStreamMeshRef.current) lubeStreamMeshRef.current.visible = false;
        if (slatherWaveMeshRef.current) slatherWaveMeshRef.current.visible = false;
      }

      // Skin & Glans material sheen and arousal flush
      if (skinMaterialRef.current && glansMaterialRef.current) {
        skinMaterialRef.current.clearcoat = 0.25 + lubeRatio * 0.75;
        skinMaterialRef.current.roughness = Math.max(0.04, 0.35 - lubeRatio * 0.29);

        glansMaterialRef.current.clearcoat = 0.6 + lubeRatio * 0.4;
        glansMaterialRef.current.roughness = Math.max(0.03, 0.26 - lubeRatio * 0.23);

        const arousalRatio = Math.min(1.0, state.resonance / 100);
        glansMaterialRef.current.emissive.setRGB(
          arousalRatio * 0.3,
          arousalRatio * 0.06,
          arousalRatio * 0.09
        );
      }

      // 2. Synchronize Stroker Sleeve position along shaft
      if (strokerGroupRef.current) {
        const targetStrokerY = 1.95 - state.strokePosition * 3.9;
        if (!isDragging.current) {
          if (state.isClickStroking) {
            // Immediate lock during active click stroke cycle
            strokerGroupRef.current.position.y = targetStrokerY;
          } else {
            // Smooth organic following
            strokerGroupRef.current.position.y += (targetStrokerY - strokerGroupRef.current.position.y) * 0.45;
          }
        } else {
          // Direct 1:1 position lock when dragging
          strokerGroupRef.current.position.y = targetStrokerY;
        }

        // Vacuum suction constriction & collar ring glow
        const vacNorm = Math.min(1.0, Math.max(0, state.vacuumPressure / 100));
        const suctionConstrict = 1.0 - vacNorm * 0.085;
        strokerGroupRef.current.scale.set(suctionConstrict, 1.0, suctionConstrict);

        if (topCollarMeshRef.current && bottomCollarMeshRef.current) {
          const collarMat = topCollarMeshRef.current.material as THREE.MeshStandardMaterial;
          collarMat.emissive = new THREE.Color(0x06b6d4);
          collarMat.emissiveIntensity = vacNorm * 0.9;
          const bCollarMat = bottomCollarMeshRef.current.material as THREE.MeshStandardMaterial;
          bCollarMat.emissive = new THREE.Color(0x06b6d4);
          bCollarMat.emissiveIntensity = vacNorm * 0.9;
        }
        if (centerRingMeshRef.current) {
          const ringMat = centerRingMeshRef.current.material as THREE.MeshStandardMaterial;
          ringMat.emissiveIntensity = 0.5 + vacNorm * 0.9;
        }

        // Biological corona engorgement response to stroking
        const strokePhase = 1 - state.strokePosition; // 1 = near glans, 0 = at base
        const squeeze = Math.sin(strokePhase * Math.PI);

        if (glansGroupRef.current) {
          const engorgement = 1.0 + squeeze * 0.08 + (state.resonance / 100) * 0.06;
          glansGroupRef.current.scale.set(engorgement, 1.0 + squeeze * 0.04, engorgement);
        }
      }

      // 3. ANCHORED SCROTUM / TESTICLES (Fixed at base, NEVER moved by finger drag)
      if (scrotumGroupRef.current) {
        scrotumGroupRef.current.position.y = -2.85 + Math.sin(now * 0.001) * 0.015;
      }

      // 4. Update Glistening 3D Meatus Semen Pearl Droplet
      if (meatusPearlMeshRef.current) {
        const arousal = Math.min(1.0, Math.max(0, state.resonance / 100));
        const pulse = Math.sin(now * 0.009) * 0.06;
        const pearlScale = 0.18 + arousal * 0.95 + (state.isSurging ? 0.75 : 0) + pulse;
        meatusPearlMeshRef.current.scale.set(pearlScale, pearlScale * 1.5, pearlScale * 1.15);
        meatusPearlMeshRef.current.position.y = 0.60 + pearlScale * 0.04;
      }

      // 4b. Automatic Projectile Globs & Gooey Sprays Triggered During Strokes / Continuous Motion
      const strokeSpeed = Math.abs(state.strokeVelocity);
      const isActivelyStroking = strokeSpeed > 0.2 || state.isClickStroking || state.isSurging;

      const currentManualStrokes = state.manualStrokes || 0;
      if (currentManualStrokes > lastStrokeCountRef.current) {
        const strokeDelta = currentManualStrokes - lastStrokeCountRef.current;
        lastStrokeCountRef.current = currentManualStrokes;
        launchViscousGlobs(Math.min(4, Math.max(2, strokeDelta * 2)), 1.35);
        launchSpecimenBurst(strokeDelta * 10, 1.3);
      }

      // During active stroke travel (dragging or automated click stroke)
      if (isActivelyStroking) {
        const cadenceSpeed = Math.max(0.8, strokeSpeed * 2.2 + (state.isClickStroking ? 3.0 : 0) + (state.isSurging ? 5.5 : 0));
        dripCadenceTimerRef.current += dt * cadenceSpeed;
        if (dripCadenceTimerRef.current >= 0.28) {
          dripCadenceTimerRef.current = 0;
          launchViscousGlobs(1, 1.15);
          launchSpecimenBurst(8, 1.1);
        }
      }

      // 4c. 3D PROJECTILE VISCOUS GLOBS FLIGHT & SPLASH DYNAMICS
      const fillFraction = Math.min(1.0, Math.max(0.06, state.liquidLevelMl / state.maxBeakerCapacity));
      const beakerSurfaceWorldY = -0.65 - 1.6 + fillFraction * 2.8;

      const globs = globPoolRef.current;
      for (let i = 0; i < globs.length; i++) {
        const glob = globs[i];
        if (glob.active) {
          glob.life -= dt;

          // Parabolic trajectory under gravity
          glob.vy -= dt * 10.8;
          glob.vx *= 0.992;
          glob.vz *= 0.992;

          glob.x += glob.vx * dt;
          glob.y += glob.vy * dt;
          glob.z += glob.vz * dt;

          glob.mesh.position.set(glob.x, glob.y, glob.z);

          // Organic aerodynamic stretching along travel vector
          const speed = Math.sqrt(glob.vx * glob.vx + glob.vy * glob.vy + glob.vz * glob.vz);
          if (speed > 0.1) {
            const dir = new THREE.Vector3(glob.vx, glob.vy, glob.vz).normalize();
            glob.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
            const stretch = Math.min(3.2, 1.25 + speed * 0.26);
            const squish = 1.0 / Math.sqrt(stretch);
            glob.mesh.scale.set(glob.scale * squish, glob.scale * stretch, glob.scale * squish);
          }

          // Landing inside the angled beaker cup (centered at X=1.75, Z=0.45)
          const bdx = glob.x - 1.75;
          const bdz = glob.z - 0.45;
          const distToBeakerCenter = Math.sqrt(bdx * bdx + bdz * bdz);

          if (distToBeakerCenter < 1.25 && glob.y <= beakerSurfaceWorldY + 0.15 && glob.y >= -2.4) {
            // Viscous glob splats directly into the beaker cup!
            glob.active = false;
            glob.mesh.visible = false;

            // Increment cup volume
            state.liquidLevelMl = Math.min(state.maxBeakerCapacity, state.liquidLevelMl + 0.18);
            state.sloshVelocity += (Math.random() - 0.5) * 0.28;

            // Expanding surface splash ring
            const ripples = splashPoolRef.current;
            for (let r = 0; r < ripples.length; r++) {
              if (!ripples[r].active) {
                ripples[r].active = true;
                ripples[r].scale = 0.16;
                ripples[r].opacity = 0.92;
                ripples[r].y = beakerSurfaceWorldY + 0.01;
                ripples[r].mesh.visible = true;
                ripples[r].mesh.position.set(glob.x, ripples[r].y, glob.z);
                break;
              }
            }

            // High-fidelity liquid splat audio
            soundManager.playFluidDrip(0.80 + Math.random() * 0.35);
          } else if (glob.life <= 0 || glob.y < -3.5) {
            glob.active = false;
            glob.mesh.visible = false;
          }
        }
      }

      // 4d. UPDATE EXPANDING SURFACE SPLASH RIPPLES
      const ripples = splashPoolRef.current;
      for (let r = 0; r < ripples.length; r++) {
        if (ripples[r].active) {
          ripples[r].scale += dt * 3.8;
          ripples[r].opacity -= dt * 2.6;
          ripples[r].mesh.position.y = beakerSurfaceWorldY + 0.01;
          ripples[r].mesh.scale.set(ripples[r].scale, ripples[r].scale, 1.0);
          (ripples[r].mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ripples[r].opacity);
          if (ripples[r].opacity <= 0 || ripples[r].scale > 1.8) {
            ripples[r].active = false;
            ripples[r].mesh.visible = false;
          }
        }
      }

      // 5. Update Semen Particle System (Parabolic trajectories & splashing into beaker)
      const pData = particleDataRef.current;
      const pSys = particleSystemRef.current;
      if (pData && pSys) {
        const { positions, velocities, lifetimes, active, count: maxParticles } = pData;
        let anyActive = false;

        // Current fluid surface in beaker world coords (Beaker Y = -0.65)
        const fillFraction = Math.min(1.0, Math.max(0.06, state.liquidLevelMl / state.maxBeakerCapacity));
        const beakerTopSurfaceWorldY = -0.65 - 1.6 + fillFraction * 2.8;

        for (let i = 0; i < maxParticles; i++) {
          if (active[i]) {
            anyActive = true;
            positions[i * 3] += velocities[i * 3] * dt * 2.8;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * dt * 2.8;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * dt * 2.8;

            // Natural gravity pulling downward
            velocities[i * 3 + 1] -= dt * 6.5;
            velocities[i * 3] *= 0.985;
            velocities[i * 3 + 1] *= 0.985;
            velocities[i * 3 + 2] *= 0.985;

            lifetimes[i] -= dt * 0.75;

            // Check if particle lands inside the graduated beaker (centered at X=1.8, Z=0.5)
            const dx = positions[i * 3] - 1.8;
            const dz = positions[i * 3 + 2] - 0.5;
            const distFromBeakerCenter = Math.sqrt(dx * dx + dz * dz);

            if (distFromBeakerCenter < 1.18 && positions[i * 3 + 1] <= beakerTopSurfaceWorldY + 0.15 && positions[i * 3 + 1] >= -2.4) {
              // Particle hit the liquid surface in the beaker!
              active[i] = false;
              positions[i * 3 + 1] = -1000;

              // Increment beaker fluid level
              state.liquidLevelMl = Math.min(
                state.maxBeakerCapacity,
                state.liquidLevelMl + 0.08
              );

              // Agitate specimen surface
              state.sloshVelocity += (Math.random() - 0.5) * 0.15;
            } else if (lifetimes[i] <= 0 || positions[i * 3 + 1] < -4) {
              active[i] = false;
              positions[i * 3 + 1] = -1000;
            }
          }
        }

        if (anyActive) {
          pSys.geometry.attributes.position.needsUpdate = true;
        }
      }

      // 6. Automatic Multi-Stage Ejaculation Fountains during Surge
      if (state.isSurging) {
        setHudSurge(true);
        burstTimer += dt;
        if (burstTimer > 0.05) {
          burstTimer = 0;
          launchSpecimenBurst(24, 2.0);
          launchViscousGlobs(4, 1.9);
          soundManager.playViscousSpurt();
        }
      } else {
        setHudSurge(false);
      }

      // 7. UPDATE 3D FLUID MESH, MENISCUS, AND FROTH IN SPECIMEN COLLECTION BEAKER
      if (beakerFluidMeshRef.current && meniscusMeshRef.current && frothMeshRef.current) {
        const fillFraction = Math.min(1.0, Math.max(0.06, state.liquidLevelMl / state.maxBeakerCapacity));
        const maxFluidHeight = 2.8;

        // Opaque pearlescent semen column rising from base (-1.6)
        beakerFluidMeshRef.current.scale.set(1.0, fillFraction, 1.0);
        beakerFluidMeshRef.current.position.y = -1.6 + (fillFraction * maxFluidHeight) / 2;
        beakerFluidMeshRef.current.rotation.z = state.sloshAngle * 0.2;

        // Glistening Meniscus Disc on top of the fluid column
        const topSurfaceLocalY = -1.6 + fillFraction * maxFluidHeight;
        meniscusMeshRef.current.position.y = topSurfaceLocalY;
        meniscusMeshRef.current.rotation.z = state.sloshAngle * 0.35;

        // Froth and bubble ring around the rim
        frothMeshRef.current.position.y = topSurfaceLocalY + 0.02;
        frothMeshRef.current.rotation.z = state.sloshAngle * 0.35;
        const frothPulse = 1.0 + Math.sin(now * 0.012) * 0.035;
        frothMeshRef.current.scale.set(frothPulse, frothPulse, 1.0);
      }

      // HUD Sync
      setHudSpeed(Math.abs(state.strokeVelocity));
      setHudVolume(state.liquidLevelMl);

      // Render Three.js frame
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, launchSpecimenBurst, launchViscousGlobs]);

  // DIRECT 1:1 TOUCH / POINTER HANDLERS
  // When sliding finger/thumb up/down, the sleeve moves at the EXACT same speed!
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    state.isManualDragging = true;
    lastTouchY.current = e.clientY;
    lastTouchTime.current = performance.now();
    strokeTravelAccumulator.current = 0;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Initial touch registers immediate manual stroke sensation and gooey spray into cup
    onManualStroke(1.2);
    launchViscousGlobs(2, 1.2);
    launchSpecimenBurst(10, 1.2);
    soundManager.playStroke(1.2, state.lubeLevel);
    hapticManager.triggerRibPass();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || lastTouchY.current === null) return;

    const now = performance.now();
    const dy = e.clientY - lastTouchY.current;
    const dt = Math.max(0.008, (now - lastTouchTime.current) / 1000);
    lastTouchY.current = e.clientY;
    lastTouchTime.current = now;

    if (Math.abs(dy) < 0.5) return;

    // Direct 1:1 stroke mapping:
    // Moving thumb UP (dy < 0) -> moves sleeve UP towards glans (0.0)
    // Moving thumb DOWN (dy > 0) -> moves sleeve DOWN towards base (1.0)
    const activeStrokeZonePixels = 160; // Natural mobile thumb stroke range
    const deltaNormalized = dy / activeStrokeZonePixels;
    const prevPosition = state.strokePosition;
    const newPosition = Math.max(0.0, Math.min(1.0, prevPosition + deltaNormalized));
    state.strokePosition = newPosition;

    // Instantly set 3D sleeve mesh position with ZERO lag
    if (strokerGroupRef.current) {
      strokerGroupRef.current.position.y = 1.95 - newPosition * 3.9;
    }

    // Instantaneous velocity calculation
    const instantaneousVelocity = Math.min(5.0, (Math.abs(dy) / (dt * 1000)) * 16);
    state.strokeVelocity = (-dy / dt) * 0.015;

    // Accumulate travel distance to trigger rhythmic stroke milestones & audio
    const travel = Math.abs(newPosition - prevPosition);
    strokeTravelAccumulator.current += travel;

    if (strokeTravelAccumulator.current >= 0.16) {
      strokeTravelAccumulator.current = 0;
      onManualStroke(instantaneousVelocity);
      engine.recordStroke(instantaneousVelocity);
      soundManager.playStroke(instantaneousVelocity, state.lubeLevel);

      // Rib texture haptic vibration
      hapticManager.triggerRibPass();
      hapticManager.triggerStrokeResistance({
        vacuumPressure: state.vacuumPressure,
        lubeLevel: state.lubeLevel,
        strokeVelocity: instantaneousVelocity,
        sleeveUpgradeLevel,
        resonatorUpgradeLevel,
        vacuumUpgradeLevel,
      });

      // Viscous Globs & Gooey Sprays ejected directly from penis meatus into Beaker Cup
      const burstCount = state.resonance > 75 ? 4 : state.resonance > 35 ? 2 : 1;
      const speedScale = 0.85 + (instantaneousVelocity / 4.0) * 0.5;
      launchViscousGlobs(burstCount, speedScale);
      launchSpecimenBurst(burstCount * 8, speedScale);
      state.liquidLevelMl = Math.min(state.maxBeakerCapacity, state.liquidLevelMl + 0.14 * burstCount);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const hadMinimalTravel = strokeTravelAccumulator.current < 0.06;
    isDragging.current = false;
    state.isManualDragging = false;
    lastTouchY.current = null;
    strokeTravelAccumulator.current = 0;

    if (hadMinimalTravel) {
      // Tap/click on 3D viewport: trigger immediate mechanical stroke, projectile globs & gooey sprays!
      onManualStroke(2.2);
      launchViscousGlobs(3, 1.4);
      launchSpecimenBurst(16, 1.3);
      soundManager.playStroke(2.2, state.lubeLevel);
      hapticManager.triggerRibPass();
    }

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const maxSpeed = 12;
  const speedPercent = Math.min(100, (hudSpeed / maxSpeed) * 100);

  return (
    <div
      ref={containerRef}
      id="physics-viewport-container"
      className="relative w-full h-80 sm:h-96 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-ns-resize" />

      {/* TOP HUD: SPEEDOMETER & CADENCE */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-300 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full border border-slate-800 shadow-lg">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span>Stroke Speed</span>
          <span className="text-cyan-400 font-bold ml-1">{hudSpeed.toFixed(1)}</span>
        </div>
        {/* Speedometer Fill Bar */}
        <div className="w-36 sm:w-44 h-2 bg-slate-900/90 rounded-full border border-slate-800 mt-1.5 overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300"
            style={{ width: `${speedPercent}%` }}
          />
        </div>
      </div>

      {/* TOP RIGHT HUD: SPECIMEN CUP WITH LIVE FILLING LEVEL */}
      <div className="absolute top-3 right-3 text-xs font-mono pointer-events-none z-10 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-xl flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
          <Beaker className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase leading-none font-bold">Specimen Cup</div>
          <div className="text-cyan-300 font-bold leading-tight">
            {hudVolume.toFixed(1)} <span className="text-slate-400 text-[10px]">/ {state.maxBeakerCapacity} mL</span>
          </div>
        </div>
      </div>

      {/* CLIMAX / EXTRACTION SURGE BANNER */}
      {hudSurge && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 text-center animate-bounce">
          <div className="text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-300 to-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]">
            ⚡ EXTRACTION SURGE ⚡
          </div>
          <div className="text-xs font-mono font-bold text-white bg-pink-600/80 px-3 py-0.5 rounded-full border border-white/50 inline-block mt-1 shadow-lg">
            PHYSICAL FLUID STREAM INTO CUP
          </div>
        </div>
      )}

      {/* THICK CLEAR LUBE SLATHERED FLOATING TOAST */}
      {showLubeToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none z-20 text-center animate-bounce">
          <div className="bg-slate-900/95 border-2 border-cyan-400 text-cyan-200 px-4 py-1.5 rounded-full shadow-[0_0_24px_rgba(6,182,212,0.7)] backdrop-blur flex items-center gap-2">
            <Droplet className="w-4 h-4 text-cyan-300 animate-pulse fill-cyan-400/40" />
            <span className="font-mono font-bold text-xs tracking-wider">
              💧 THICK CLEAR SILICONE LUBE SLATHERED (+40%)
            </span>
          </div>
          <div className="text-[10px] font-mono text-cyan-300/80 mt-0.5 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30 inline-block shadow">
            Ultra-Viscous Gel Layer Applied • Friction Reduced
          </div>
        </div>
      )}

      {/* VACUUM SUCTION ENGAGED FLOATING TOAST */}
      {showVacuumToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 pointer-events-none z-20 text-center">
          <div className="bg-slate-900/95 border-2 border-cyan-400 text-cyan-200 px-4 py-1.5 rounded-full shadow-[0_0_24px_rgba(6,182,212,0.6)] backdrop-blur flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="font-mono font-bold text-xs tracking-wider">
              🌀 VACUUM PUMP ENGAGED: {Math.round(state.vacuumPressure || state.targetVacuum)} kPa
            </span>
          </div>
          <div className="text-[10px] font-mono text-cyan-300/80 mt-0.5 bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30 inline-block shadow">
            Airtight Silicone Sleeve Clamped • Suction Active
          </div>
        </div>
      )}

      {/* BOTTOM HUD: INTERACTION GUIDANCE & LUBE STATUS */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none z-10 text-xs font-mono">
        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px]">Slide thumb up/down to stroke sleeve 1:1</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 text-[11px]">
          <Droplet className={`w-3 h-3 ${state.lubeLevel > 30 ? 'text-cyan-400' : 'text-amber-500'}`} />
          <span>Lube:</span>
          <span className={state.lubeLevel > 30 ? 'text-cyan-300 font-bold' : 'text-amber-400 font-bold'}>
            {Math.round(state.lubeLevel)}%
          </span>
        </div>
      </div>
    </div>
  );
};
