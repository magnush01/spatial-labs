import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, ArrowRight, Box, Layers, Zap, Cpu, Globe, ChevronRight, CheckCircle, FileJson, Loader } from 'lucide-react';
import { Analytics, track } from '@vercel/analytics/react';
import WorkflowModelViewer from './components/WorkflowModelViewer.jsx';
import PromptWindow from './components/PromptWindow.jsx';
import WaitlistModal from './components/WaitlistModal.jsx';
import WorkflowDiagram from './components/WorkflowDiagram.jsx';

/**
 * HERO CANVAS
 * The original simple renderer for the Hero section
 */
const HeroCanvas = ({ promptIntensity = 1 }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const rotationRef = useRef({ x: 0.5, y: 0.8, targetX: 0.5, targetY: 0.8 });

  const bayerMatrix = useMemo(() => [
    [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
  ], []);

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    rotationRef.current.targetY = x * Math.PI * 2;
    rotationRef.current.targetX = y * Math.PI - Math.PI / 2;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let width, height;

    const createCube = (cx, cy, cz, size, hScale) => {
      const h = size * hScale;
      return [
        { x: cx - size, y: cy - h, z: cz - size }, { x: cx + size, y: cy - h, z: cz - size },
        { x: cx + size, y: cy + h, z: cz - size }, { x: cx - size, y: cy + h, z: cz - size },
        { x: cx - size, y: cy - h, z: cz + size }, { x: cx + size, y: cy - h, z: cz + size },
        { x: cx + size, y: cy + h, z: cz + size }, { x: cx - size, y: cy + h, z: cz + size },
      ];
    };

    const project = (v, rx, ry) => {
      let x = v.x, y = v.y, z = v.z;
      let x1 = x * Math.cos(ry) - z * Math.sin(ry);
      let z1 = x * Math.sin(ry) + z * Math.cos(ry);
      let y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      let z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      const fov = 400;
      const scale = fov / (fov + z2 + 400);
      return { x: x1 * scale + canvas.width / 2, y: y1 * scale + canvas.height / 2, z: z2 };
    };

    const resize = () => {
      const parent = canvas.parentElement;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width / 2;
      canvas.height = height / 2;
      ctx.imageSmoothingEnabled = false;
    };
    window.addEventListener('resize', resize);
    resize();

    const animate = (time) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const lerp = (a, b, t) => a + (b - a) * t;
      rotationRef.current.y = lerp(rotationRef.current.y, rotationRef.current.targetY, 0.05);
      rotationRef.current.x = lerp(rotationRef.current.x, rotationRef.current.targetX, 0.05);

      const t = time * 0.001;
      const buildingHeight = 50 + (promptIntensity * 150);

      let cubes = [];
      cubes.push({ verts: createCube(0, 0, 0, 40, buildingHeight / 40), color: 0.8 });

      if (promptIntensity > 0.3) cubes.push({ verts: createCube(60, 40, 0, 20, 1 + Math.sin(t) * 0.2), color: 0.5 });
      if (promptIntensity > 0.6) {
        cubes.push({ verts: createCube(-50, 20, 50, 25, 2), color: 0.6 });
        cubes.push({ verts: createCube(-50, -50, -50, 15, 1.5), color: 0.4 });
      }

      cubes.forEach(cube => {
        const projected = cube.verts.map(v => project(v, rotationRef.current.x, rotationRef.current.y));
        const faces = [[0, 1, 2, 3], [1, 5, 6, 2], [5, 4, 7, 6], [4, 0, 3, 7], [3, 2, 6, 7], [4, 5, 1, 0]];

        faces.forEach((face, i) => {
          let light = cube.color;
          if (i === 1) light *= 0.6; if (i === 4) light *= 1.2; if (i === 3) light *= 0.4;
          const c = Math.floor(light * 255);
          ctx.beginPath();
          ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
          for (let j = 1; j < face.length; j++) ctx.lineTo(projected[face[j]].x, projected[face[j]].y);
          ctx.closePath();
          ctx.fillStyle = `rgb(${c},${c},${c})`;
          ctx.fill();
        });
      });

      // Dither Pass
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4;
          const old = data[i];
          const thres = (bayerMatrix[y % 4][x % 4] / 16) * 255;
          const val = old > thres ? 255 : 0;
          [i, i + 4, ((y + 1) * w + x) * 4, ((y + 1) * w + x) * 4 + 4].forEach(idx => {
            if (idx < data.length) { data[idx] = val; data[idx + 1] = val; data[idx + 2] = val; data[idx + 3] = 255; }
          });
        }
      }
      ctx.putImageData(imageData, 0, 0);
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(requestRef.current); };
  }, [promptIntensity, bayerMatrix]);

  return (
    <canvas ref={canvasRef} onMouseMove={handleMouseMove} className="w-full h-full object-cover mix-blend-screen cursor-crosshair" />
  );
};

/**
 * WORKFLOW CANVAS
 * Advanced renderer that handles steps: Generation, Layers, Final View
 */
const WorkflowCanvas = ({ step, activeLayers }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const rotationRef = useRef({ x: 0.5, y: 0.8 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const resize = () => {
      canvas.width = canvas.parentElement.clientWidth / 2;
      canvas.height = canvas.parentElement.clientHeight / 2;
      ctx.imageSmoothingEnabled = false;
    };
    window.addEventListener('resize', resize);
    resize();

    const createCube = (cx, cy, cz, size, hScale) => {
      const h = size * hScale;
      return [
        { x: cx - size, y: cy - h, z: cz - size }, { x: cx + size, y: cy - h, z: cz - size },
        { x: cx + size, y: cy + h, z: cz - size }, { x: cx - size, y: cy + h, z: cz - size },
        { x: cx - size, y: cy - h, z: cz + size }, { x: cx + size, y: cy - h, z: cz + size },
        { x: cx + size, y: cy + h, z: cz + size }, { x: cx - size, y: cy + h, z: cz + size },
      ];
    };

    const project = (v, rx, ry) => {
      let x = v.x, y = v.y, z = v.z;
      let x1 = x * Math.cos(ry) - z * Math.sin(ry);
      let z1 = x * Math.sin(ry) + z * Math.cos(ry);
      let y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      let z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      const fov = 400;
      const scale = fov / (fov + z2 + 400);
      // Adjusted Y offset for larger canvas centering
      return { x: x1 * scale + canvas.width / 2, y: y1 * scale + canvas.height / 2 + 20, z: z2 };
    };

    const animate = (time) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spin logic based on step
      let spinSpeed = 0.01;
      if (step === 1) spinSpeed = 0.05; // Fast spin during generation
      if (step === 4) spinSpeed = 0.02; // Final view

      rotationRef.current.y += spinSpeed;

      // Build Geometry based on step
      let cubes = [];
      let growFactor = step >= 1 ? 1 : 0.1; // Grow animation
      if (step === 1) growFactor = (Math.sin(time * 0.002) + 1) * 0.5 + 0.5;

      // Increase scale factor for larger window
      const scaleMult = 1.3;

      // CORE
      if (activeLayers.core) {
        cubes.push({ verts: createCube(0, 30, 0, 25 * scaleMult, 3 * growFactor), color: 0.9 });
      }
      // FACADE
      if (activeLayers.facade) {
        const satCount = 6;
        for (let i = 0; i < satCount; i++) {
          const angle = (i / satCount) * Math.PI * 2;
          cubes.push({
            verts: createCube(Math.cos(angle) * 50 * scaleMult, 60, Math.sin(angle) * 50 * scaleMult, 10 * scaleMult, 1.5 * growFactor),
            color: 0.6
          });
        }
      }

      cubes.forEach(cube => {
        const projected = cube.verts.map(v => project(v, rotationRef.current.x, rotationRef.current.y));
        const faces = [[0, 1, 2, 3], [1, 5, 6, 2], [5, 4, 7, 6], [4, 0, 3, 7], [3, 2, 6, 7], [4, 5, 1, 0]];

        faces.forEach((face, i) => {
          let light = cube.color;
          if (i === 1) light *= 0.6; if (i === 4) light *= 1.2; if (i === 3) light *= 0.4;
          const c = Math.floor(light * 255);

          ctx.beginPath();
          ctx.moveTo(projected[face[0]].x, projected[face[0]].y);
          for (let j = 1; j < face.length; j++) ctx.lineTo(projected[face[j]].x, projected[face[j]].y);
          ctx.closePath();

          if (step === 4) { // Final view: Clean render
            ctx.fillStyle = `rgb(${c},${c},${c})`;
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.stroke();
          } else { // Dither style for others
            ctx.fillStyle = `rgb(${c},${c},${c})`;
            ctx.fill();
          }
        });
      });

      // Dither Pass (Disable for Final View step 4 for clarity or keep if consistent style desired)
      if (step !== 4) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = data[i];
          const x = (i / 4) % canvas.width;
          const y = Math.floor((i / 4) / canvas.width);
          const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
          const thres = (bayer[y % 4][x % 4] / 16) * 255;
          const val = avg > thres ? 255 : 0;
          if (data[i + 3] > 0) { // Only affect drawn pixels
            data[i] = val; data[i + 1] = val; data[i + 2] = val;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [step, activeLayers]);

  return <canvas ref={canvasRef} className="w-full h-full object-cover" />;
};


/**
 * WORKFLOW SHOWCASE SECTION
 */
const WorkflowShowcase = () => {
  const [step, setStep] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [logs, setLogs] = useState([]);
  const [layers, setLayers] = useState({ core: true, facade: true });
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Intersection Observer to detect when section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.2, // Trigger when 20% of the section is visible
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [isVisible]);

  // Workflow Timeline - only runs when visible
  useEffect(() => {
    if (!isVisible) return;

    const fullText = "Design a mid-rise HQ with sustainable facade...";
    let timer;

    const runSequence = async () => {
      // STEP 0: Type Prompt
      setStep(0);
      setLogs([]);
      setLayers({ core: false, facade: false });
      for (let i = 0; i <= fullText.length; i++) {
        setDisplayedText(fullText.slice(0, i));
        await new Promise(r => setTimeout(r, 50));
      }
      await new Promise(r => setTimeout(r, 500));

      // STEP 1: Viewport Generation
      setStep(1);
      setLayers({ core: true, facade: true }); // Start growing
      await new Promise(r => setTimeout(r, 3000));

      // STEP 2: Chain of Thought
      setStep(2);
      const thoughts = [
        "> Analyzing local zoning laws...",
        "> Calculating structural load...",
        "> Optimizing for solar gain...",
        "> Verifying LEED compliance..."
      ];
      for (let log of thoughts) {
        setLogs(prev => [...prev, log]);
        await new Promise(r => setTimeout(r, 600));
      }

      // STEP 3: Layer Structure (Toggle)
      setStep(3);
      setLogs(prev => [...prev, "> Layer check: CORE"]);
      setLayers({ core: true, facade: false });
      await new Promise(r => setTimeout(r, 1000));

      setLogs(prev => [...prev, "> Layer check: FACADE"]);
      setLayers({ core: false, facade: true });
      await new Promise(r => setTimeout(r, 1000));

      setLogs(prev => [...prev, "> Layer check: COMPOSITE"]);
      setLayers({ core: true, facade: true });
      await new Promise(r => setTimeout(r, 1000));

      // STEP 4: Final View
      setStep(4);
      await new Promise(r => setTimeout(r, 3000));

      // STEP 5: Export
      setStep(5);
      await new Promise(r => setTimeout(r, 2000));

      // Reset Loop
      runSequence();
    };

    runSequence();
    return () => clearTimeout(timer);
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="py-40 border-b border-white/10 bg-black overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12 md:mb-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Generative 3D</h2>
          <p className="text-gray-400">From text prompt to manufacturable IFC file in seconds.</p>
        </div>

        {/* Increased height to 800px for a bigger window */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border border-white/10 bg-[#050505] h-[800px] relative">

          {/* LEFT: AGENT CONTROL */}
          <div className="lg:col-span-4 border-r border-white/10 p-6 flex flex-col gap-6 relative z-10 bg-[#050505]">

            {/* Step 1: Prompt */}
            <div className={`transition-opacity duration-500 ${step >= 0 ? 'opacity-100' : 'opacity-30'}`}>
              <div className="text-[10px] font-mono text-gray-500 uppercase mb-2">01. Prompt</div>
              <div className="p-3 border border-white/20 bg-black font-mono text-sm h-20">
                {displayedText}<span className="animate-pulse">_</span>
              </div>
            </div>

            {/* Step 2/3: Chain of Thought */}
            <div className={`flex-1 transition-opacity duration-500 ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
              <div className="text-[10px] font-mono text-gray-500 uppercase mb-2">02. Reasoning Engine</div>
              <div className="h-full font-mono text-xs text-green-500/80 space-y-2 overflow-hidden">
                {logs.map((log, i) => (
                  <div key={i} className="animate-fade-in">{log}</div>
                ))}
              </div>
            </div>

            {/* Step 6: Export */}
            <div className={`mt-auto transition-opacity duration-500 ${step === 5 ? 'opacity-100' : 'opacity-30'}`}>
              <div className="text-[10px] font-mono text-gray-500 uppercase mb-2">03. Delivery</div>
              <button className={`w-full py-3 border border-white/20 flex items-center justify-center gap-2 text-sm font-bold ${step === 5 ? 'bg-white text-black' : 'bg-transparent text-gray-500'}`}>
                {step === 5 ? <CheckCircle className="w-4 h-4" /> : <FileJson className="w-4 h-4" />}
                {step === 5 ? 'EXPORT COMPLETE' : 'WAITING FOR OUTPUT'}
              </button>
            </div>
          </div>

          {/* RIGHT: VIEWPORT */}
          <div className="lg:col-span-8 relative bg-black flex flex-col">
            {/* Overlay UI */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <div className="px-2 py-1 bg-white/10 backdrop-blur text-[10px] font-mono rounded border border-white/10 text-white">
                MODE: {step === 0 ? 'IDLE' : step === 1 ? 'GENERATING' : step === 3 ? 'SEMANTIC VIEW' : step === 4 ? 'FINAL RENDER' : 'LOCKED'}
              </div>
              {step === 3 && (
                <div className="flex gap-1">
                  <span className={`px-2 py-1 text-[10px] border ${layers.core ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-gray-800 text-gray-600'}`}>CORE</span>
                  <span className={`px-2 py-1 text-[10px] border ${layers.facade ? 'bg-green-500/20 border-green-500 text-green-500' : 'border-gray-800 text-gray-600'}`}>FACADE</span>
                </div>
              )}
            </div>

            {/* Visual Canvas */}
            <div className="flex-1 relative">
              {/* Grid bg */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

              <WorkflowModelViewer step={step} activeLayers={layers} />

              {/* Loading Spinner Overlay for Generation */}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};


/**
 * MAIN COMPONENT
 */
const SpatialLabs = () => {
  const [intensity, setIntensity] = useState(0);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-x-hidden">

      {/* HEADER */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white" />
            <span className="font-bold tracking-tighter text-lg">SPATIAL LABS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-mono text-gray-400">
            <a href="#" onClick={() => track('nav_click', { label: 'RESEARCH' })} className="hover:text-white transition-colors">RESEARCH</a>
            <a href="#" onClick={() => track('nav_click', { label: 'API' })} className="hover:text-white transition-colors">API</a>
            <a href="#" onClick={() => track('nav_click', { label: 'COMPANY' })} className="hover:text-white transition-colors">COMPANY</a>
            <button
              onClick={() => {
                track('cta_click', { location: 'header' });
                setIsWaitlistOpen(true);
              }}
              className="text-white border border-white/20 px-4 py-1 hover:bg-white hover:text-black transition-all"
            >
              ACCESS
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/20 rounded-full text-xs font-mono text-gray-400 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              SYSTEM ONLINE V2.4
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95]">
              Intelligence for the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-600">
                Built World.
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md leading-relaxed">
              The first spatial reasoning model capable of understanding, generating, and optimizing 3D architecture in real-time.
            </p>
            <div className="mt-12">
              <PromptWindow onPromptUpdate={(text) => setIntensity(Math.min(1, text.length / 50))} />
            </div>
          </div>
          <div className="relative h-[400px] lg:h-[600px] w-full border border-white/10 bg-black overflow-hidden flex items-center justify-center group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(black,transparent_90%)]" />
            <div className="relative z-10 w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500">
              <HeroCanvas promptIntensity={intensity} />
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
              <div className="font-mono text-[10px] text-gray-500 space-y-1">
                <div>ROTATION: {(intensity * 360).toFixed(0)}°</div>
                <div>POLYGONS: {(intensity * 4500).toFixed(0)}</div>
                <div>RENDER: DITHER_1BIT</div>
              </div>
              <div className="w-12 h-12 border border-white/20 flex items-center justify-center rounded-full animate-spin-slow">
                <Box className="w-5 h-5 text-white/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: AGENTIC WORKFLOW SHOWCASE */}
      <WorkflowShowcase />

      {/* NEW: WORKFLOW DIAGRAM */}
      <WorkflowDiagram />



      {/* FEATURE GRID */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">The new standard for <br /> architectural intelligence.</h2>
            <p className="text-gray-400 max-w-2xl">
              Traditional CAD tools are passive. Spatial Labs builds active agents that understand structural integrity, zoning laws, and aesthetic cohesion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-white/10">
            {[
              {
                icon: <Layers className="w-6 h-6" />,
                title: "Semantic Layers",
                desc: "The model distinguishes between load-bearing elements, MEP systems, and facade treatments instantly."
              },
              {
                icon: <Cpu className="w-6 h-6" />,
                title: "Generative Solve",
                desc: "Input constraints (FAR, setbacks, light). Receive optimized massing options in seconds."
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: "Global Context",
                desc: "Trained on 50M+ structures to understand vernacular architecture across every continent."
              }
            ].map((item, i) => (
              <div key={i} className="border-r border-b border-white/10 p-8 md:p-12 hover:bg-white/5 transition-colors group cursor-default">
                <div className="mb-6 text-gray-500 group-hover:text-white transition-colors">{item.icon}</div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* BIG CTA */}
      <section id="waitlist" className="py-32 border-t border-white/10 bg-white text-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
          <div>
            <h2 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6">
              BUILD <br /> FASTER.
            </h2>
            <p className="text-xl max-w-md text-gray-600">
              Join the waitlist for the private beta.
              Currently onboarding architectural firms and developers.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <button
              onClick={() => {
                track('cta_click', { location: 'footer_cta' });
                setIsWaitlistOpen(true);
              }}
              className="group flex items-center justify-between w-full md:w-96 px-8 py-6 bg-black text-white hover:bg-gray-900 transition-all"
            >
              <span className="font-mono text-lg tracking-wider">REQUEST ACCESS</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="mt-4 text-xs font-mono text-gray-500 text-center md:text-right">
              LIMITED AVAILABILITY Q1 2026
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs font-mono text-gray-600">
          <div className="flex gap-6 mb-4 md:mb-0">
            <a href="#" onClick={() => track('social_click', { platform: 'twitter' })} className="hover:text-white">TWITTER</a>
            <a href="#" onClick={() => track('social_click', { platform: 'github' })} className="hover:text-white">GITHUB</a>
            <a href="#" onClick={() => track('social_click', { platform: 'linkedin' })} className="hover:text-white">LINKEDIN</a>
          </div>
          <div>
            © 2025 SPATIAL LABS INC. <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mx-2"></span> ALL SYSTEMS NOMINAL.

          </div>
        </div>
      </footer>

      <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />

      <Analytics />
    </div>
  );
};

export default SpatialLabs;