import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Terminal, Box, Layers, Zap, Cpu, Globe, ChevronRight, 
  Maximize2, Settings, Share2, Download, Command, 
  MousePointer2, Move, RotateCw, Sidebar, Activity,
  ChevronDown, Eye, EyeOff, Plus
} from 'lucide-react';

/**
 * ENGINE: ENHANCED DITHER RENDERER
 * Optimized for "Editor View" with grid floors and selection highlights
 */
const EditorCanvas = ({ heightParam, densityParam, isGenerating }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const rotationRef = useRef({ x: 0.6, y: 0.6, targetX: 0.6, targetY: 0.6 });

  const bayerMatrix = useMemo(() => [
    [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
  ], []);

  // Mouse interaction for viewport rotation
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; 
    const y = (e.clientY - rect.top) / rect.height; 
    rotationRef.current.targetY = x * Math.PI * 2;
    rotationRef.current.targetX = (y * Math.PI) - Math.PI/2;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const createCube = (cx, cy, cz, size, hScale) => {
      const h = size * hScale;
      return [
        { x: cx-size, y: cy-h, z: cz-size }, { x: cx+size, y: cy-h, z: cz-size },
        { x: cx+size, y: cy+h, z: cz-size }, { x: cx-size, y: cy+h, z: cz-size },
        { x: cx-size, y: cy-h, z: cz+size }, { x: cx+size, y: cy-h, z: cz+size },
        { x: cx+size, y: cy+h, z: cz+size }, { x: cx-size, y: cy+h, z: cz+size },
      ];
    };

    const project = (v, rx, ry, w, h) => {
      let x = v.x, y = v.y, z = v.z;
      // Rotate Y
      let x1 = x * Math.cos(ry) - z * Math.sin(ry);
      let z1 = x * Math.sin(ry) + z * Math.cos(ry);
      // Rotate X
      let y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
      let z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
      // Perspective
      const fov = 500;
      const scale = fov / (fov + z2 + 500);
      return { x: x1 * scale + w/2, y: y1 * scale + h/2, z: z2 };
    };

    const animate = () => {
        const w = canvas.width;
        const h = canvas.height;
        
        // Lerp Rotation
        const lerp = (a, b, t) => a + (b - a) * t;
        rotationRef.current.x = lerp(rotationRef.current.x, rotationRef.current.targetX, 0.1);
        rotationRef.current.y = lerp(rotationRef.current.y, rotationRef.current.targetY, 0.1);

        // Clear Background
        ctx.fillStyle = '#111'; // Slightly lighter black for editor bg
        ctx.fillRect(0, 0, w, h);

        // 1. Draw Grid Floor
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        const gridSize = 200;
        const step = 40;
        ctx.beginPath();
        for(let i = -gridSize; i <= gridSize; i+=step) {
            const p1 = project({x: i, y: 100, z: -gridSize}, rotationRef.current.x, rotationRef.current.y, w, h);
            const p2 = project({x: i, y: 100, z: gridSize}, rotationRef.current.x, rotationRef.current.y, w, h);
            const p3 = project({x: -gridSize, y: 100, z: i}, rotationRef.current.x, rotationRef.current.y, w, h);
            const p4 = project({x: gridSize, y: 100, z: i}, rotationRef.current.x, rotationRef.current.y, w, h);
            ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
            ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
        }
        ctx.stroke();

        // 2. Generate Dynamic Architecture
        let cubes = [];
        const mainHeight = (heightParam / 100) * 3; // Height multiplier
        
        // Main Tower
        cubes.push({ verts: createCube(0, 50, 0, 30, mainHeight), color: 0.9 });
        
        // Satellites (based on density)
        if (densityParam > 20) cubes.push({ verts: createCube(50, 80, 20, 15, 1), color: 0.6 });
        if (densityParam > 50) cubes.push({ verts: createCube(-40, 70, -40, 20, 1.5), color: 0.7 });
        if (densityParam > 80) {
            cubes.push({ verts: createCube(0, -mainHeight*20, 0, 10, 2), color: 0.95 }); // Antenna
            cubes.push({ verts: createCube(60, 90, -30, 10, 0.5), color: 0.5 });
        }

        // Draw Cubes
        cubes.forEach(cube => {
            // Wireframe effect for "generating" state
            if (isGenerating && Math.random() > 0.5) return;

            const projVerts = cube.verts.map(v => project(v, rotationRef.current.x, rotationRef.current.y, w, h));
            const faces = [[0,1,2,3], [1,5,6,2], [5,4,7,6], [4,0,3,7], [3,2,6,7], [4,5,1,0]]; // Standard cube faces
            
            faces.forEach((face, i) => {
                // Simple painter's alg (z-sort would be better but expensive for this demo)
                ctx.beginPath();
                ctx.moveTo(projVerts[face[0]].x, projVerts[face[0]].y);
                for(let j=1; j<face.length; j++) ctx.lineTo(projVerts[face[j]].x, projVerts[face[j]].y);
                ctx.closePath();
                
                let shade = cube.color;
                if (i===1) shade *= 0.6;
                if (i===3) shade *= 0.4;
                if (i===4) shade *= 1.2; // Top
                
                const c = Math.floor(shade * 255);
                ctx.fillStyle = `rgb(${c},${c},${c})`;
                ctx.fill();
                ctx.strokeStyle = isGenerating ? '#00ff00' : '#000'; // Matrix green outline when gen
                ctx.stroke();
            });
        });

        // 3. Dither Filter
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
                const i = (y * w + x) * 4;
                const old = data[i];
                const thres = (bayerMatrix[y%4][x%4]/16) * 255;
                const val = old > thres ? 255 : (old > thres/3 ? 40 : 0); // 3-tone dither for editor
                
                // Apply to 2x2 block
                const setP = (idx, v) => { if(idx<data.length) { data[idx]=v; data[idx+1]=v; data[idx+2]=v; data[idx+3]=255; }};
                setP(i, val); setP(i+4, val); 
                setP(((y+1)*w+x)*4, val); setP(((y+1)*w+x)*4+4, val);
            }
        }
        ctx.putImageData(imageData, 0, 0);
        requestRef.current = requestAnimationFrame(animate);
    };

    const resize = () => {
        canvas.width = canvas.parentElement.clientWidth / 2;
        canvas.height = canvas.parentElement.clientHeight / 2;
        ctx.imageSmoothingEnabled = false;
    };
    window.addEventListener('resize', resize);
    resize();
    requestRef.current = requestAnimationFrame(animate);
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(requestRef.current); };
  }, [heightParam, densityParam, isGenerating]);

  return <canvas ref={canvasRef} onMouseMove={handleMouseMove} className="w-full h-full object-cover cursor-crosshair" />;
};


/**
 * COMPONENT: SIDEBAR ITEM
 */
const ToolItem = ({ icon: Icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full p-3 flex items-center gap-3 text-xs font-mono border-b border-white/10 hover:bg-white/10 transition-colors ${active ? 'bg-white text-black hover:bg-white' : 'text-gray-400'}`}
    >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
        {active && <ChevronRight className="w-3 h-3 ml-auto" />}
    </button>
);

const StatRow = ({ label, value, unit, change }) => (
    <div className="flex justify-between items-center py-2 border-b border-white/5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
        <div className="text-right">
            <span className="text-xs font-mono font-bold">{value}</span>
            <span className="text-[10px] text-gray-600 ml-1">{unit}</span>
        </div>
    </div>
);


/**
 * MAIN APPLICATION
 */
const SpatialStudio = ({ onBack }) => {
  const [activeTool, setActiveTool] = useState('generate');
  const [prompt, setPrompt] = useState('');
  const [logs, setLogs] = useState(['> SYSTEM INITIALIZED', '> READY FOR INPUT']);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Parameters
  const [height, setHeight] = useState(50);
  const [density, setDensity] = useState(30);
  const [complexity, setComplexity] = useState(10);

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!prompt) return;
    
    setLogs(prev => [...prev, `> INPUT: ${prompt}`, '> PROCESSING GEOMETRY...', '> OPTIMIZING MESH...']);
    setPrompt('');
    setIsGenerating(true);
    
    // Simulate generation time
    setTimeout(() => {
        setLogs(prev => [...prev, '> COMPLETE. OBJECT RENDERED.']);
        setIsGenerating(false);
        // Randomize params slightly to simulate AI decision
        setHeight(Math.random() * 60 + 20);
        setDensity(Math.random() * 80 + 10);
    }, 2000);
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans selection:bg-white selection:text-black">
      
      {/* TOP BAR */}
      <header className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-[#050505]">
        <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Back to landing page"
              >
                <ChevronRight className="w-4 h-4 rotate-180 text-gray-400" />
              </button>
            )}
            <div className="w-3 h-3 bg-white" />
            <span className="font-bold tracking-tight text-sm">SPATIAL STUDIO <span className="text-gray-600 font-mono text-xs ml-2">v1.0.4-beta</span></span>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center px-3 py-1 bg-white/5 border border-white/10 rounded text-xs gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                <span className="font-mono text-gray-400">{isGenerating ? 'PROCESSING' : 'IDLE'}</span>
            </div>
            <button className="p-2 hover:bg-white/10 rounded"><Share2 className="w-4 h-4 text-gray-400" /></button>
            <button className="bg-white text-black px-3 py-1.5 text-xs font-bold flex items-center gap-2 hover:bg-gray-200">
                <Download className="w-3 h-3" /> EXPORT IFC
            </button>
        </div>
      </header>

      {/* MAIN WORKSPACE GRID */}
      <div className="flex-1 grid grid-cols-[260px_1fr_300px] overflow-hidden">
        
        {/* LEFT SIDEBAR: ASSETS & TOOLS */}
        <aside className="border-r border-white/10 bg-[#0a0a0a] flex flex-col">
            <div className="p-3 border-b border-white/10">
                <h3 className="text-[10px] font-mono text-gray-500 uppercase mb-2">Modes</h3>
                <div className="flex gap-1">
                    <button className="flex-1 bg-white/10 p-1.5 rounded hover:bg-white/20"><MousePointer2 className="w-4 h-4 mx-auto"/></button>
                    <button className="flex-1 bg-transparent p-1.5 rounded hover:bg-white/10"><Move className="w-4 h-4 mx-auto text-gray-500"/></button>
                    <button className="flex-1 bg-transparent p-1.5 rounded hover:bg-white/10"><RotateCw className="w-4 h-4 mx-auto text-gray-500"/></button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                <div className="border-b border-white/10">
                    <ToolItem icon={Cpu} label="Generative Params" active={activeTool === 'generate'} onClick={() => setActiveTool('generate')} />
                    <ToolItem icon={Layers} label="Layer Manager" active={activeTool === 'layers'} onClick={() => setActiveTool('layers')} />
                    <ToolItem icon={Globe} label="Context / Map" active={activeTool === 'map'} onClick={() => setActiveTool('map')} />
                </div>

                {/* Layer Tree Simulation */}
                <div className="p-4">
                     <h3 className="text-[10px] font-mono text-gray-500 uppercase mb-3">Scene Graph</h3>
                     <ul className="text-xs font-mono space-y-2 text-gray-400">
                        <li className="flex items-center gap-2 text-white"><ChevronDown className="w-3 h-3" /> Root_Site_01</li>
                        <li className="pl-4 flex items-center gap-2"><Eye className="w-3 h-3" /> Building_Core</li>
                        <li className="pl-4 flex items-center gap-2"><Eye className="w-3 h-3" /> Facade_System</li>
                        <li className="pl-4 flex items-center gap-2 text-gray-600"><EyeOff className="w-3 h-3" /> Vegetation_L2</li>
                        <li className="pl-4 flex items-center gap-2"><Eye className="w-3 h-3" /> Context_Mesh</li>
                     </ul>
                </div>
            </div>

            <div className="p-4 border-t border-white/10">
                 <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Settings className="w-3 h-3" /> Preferences
                 </div>
            </div>
        </aside>

        {/* CENTER: VIEWPORT & TERMINAL */}
        <main className="relative flex flex-col bg-[#050505]">
            
            {/* Viewport Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <div className="bg-black/80 backdrop-blur border border-white/10 px-3 py-1 text-[10px] font-mono text-gray-400 flex gap-4 rounded-full">
                    <span>X: 124.04</span>
                    <span>Y: 45.22</span>
                    <span>Z: 0.00</span>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex gap-2">
                 <button className="bg-black/80 backdrop-blur border border-white/10 p-2 rounded hover:text-white text-gray-400">
                    <Maximize2 className="w-4 h-4" />
                 </button>
            </div>

            {/* 3D CANVAS */}
            <div className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />
                <EditorCanvas heightParam={height} densityParam={density} isGenerating={isGenerating} />
            </div>

            {/* BOTTOM TERMINAL */}
            <div className="h-48 border-t border-white/10 bg-black flex flex-col">
                <div className="flex-1 p-3 font-mono text-xs text-gray-500 overflow-y-auto font-thin space-y-1">
                    {logs.map((log, i) => (
                        <div key={i} className={i === logs.length - 1 ? 'text-white' : ''}>{log}</div>
                    ))}
                    <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
                </div>
                
                <form onSubmit={handleGenerate} className="h-10 border-t border-white/10 flex items-center px-2 bg-[#0a0a0a]">
                    <ChevronRight className="w-4 h-4 text-green-500 animate-pulse mr-2" />
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe changes (e.g., 'Increase floor area ratio by 20%', 'Add brutalisim')" 
                        className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder:text-gray-700 h-full"
                    />
                    <span className="text-[10px] text-gray-600 px-2 border border-white/10 rounded">ENTER TO EXECUTE</span>
                </form>
            </div>
        </main>

        {/* RIGHT SIDEBAR: INSPECTOR */}
        <aside className="border-l border-white/10 bg-[#0a0a0a] flex flex-col">
            <div className="p-4 border-b border-white/10">
                <h2 className="text-xs font-bold tracking-widest mb-1">INSPECTOR</h2>
                <span className="text-[10px] font-mono text-gray-500">ID: #882-ALPHA-X</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8">
                
                {/* PARAMETRIC CONTROLS */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-mono text-green-500 uppercase flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Active Parameters
                    </h3>
                    
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] uppercase text-gray-400">
                                <span>Max Height</span>
                                <span>{height.toFixed(0)}m</span>
                            </div>
                            <input 
                                type="range" min="10" max="100" 
                                value={height} onChange={(e) => setHeight(parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] uppercase text-gray-400">
                                <span>Urban Density</span>
                                <span>{density.toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="100" 
                                value={density} onChange={(e) => setDensity(parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-[10px] uppercase text-gray-400">
                                <span>Facade Complexity</span>
                                <span>Medium</span>
                            </div>
                             <input 
                                type="range" min="0" max="100" 
                                value={complexity} onChange={(e) => setComplexity(parseFloat(e.target.value))}
                                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                        </div>
                    </div>
                </div>

                {/* LIVE ANALYSIS */}
                <div className="p-3 bg-white/5 border border-white/10 rounded">
                    <h3 className="text-[10px] font-mono text-white uppercase mb-3 border-b border-white/10 pb-2">
                        Analysis Deck
                    </h3>
                    <StatRow label="Gross Floor Area" value={(height * density * 1.2).toFixed(0)} unit="sqm" />
                    <StatRow label="Est. Carbon Cost" value={(height * 4.5).toFixed(1)} unit="tons" />
                    <StatRow label="Solar Efficiency" value="84.2" unit="%" />
                    <StatRow label="Structural Load" value="Normal" unit="" />
                </div>

                {/* AI INSIGHTS */}
                <div className="space-y-2">
                    <h3 className="text-[10px] font-mono text-gray-500 uppercase">Model Insights</h3>
                    <div className="p-2 text-[10px] text-gray-400 bg-blue-900/10 border-l-2 border-blue-500 leading-relaxed">
                        Tip: Increasing height beyond 80m will trigger additional zoning setback requirements in the current context map.
                    </div>
                </div>

            </div>

            <div className="p-4 border-t border-white/10">
                <button className="w-full py-2 bg-white text-black text-xs font-bold hover:bg-gray-200">
                    COMMIT CHANGES
                </button>
            </div>
        </aside>

      </div>
    </div>
  );
};

export default SpatialStudio;