import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, ArrowRight, Box, Layers, Zap, Cpu, Globe, ChevronRight } from 'lucide-react';

/**
 * DITHER ENGINE & 3D RENDERER
 * A lightweight custom canvas renderer to achieve the specific 1-bit dither aesthetic
 * without heavy external libraries.
 */

const DitherCanvas = ({ promptIntensity = 1, objectType = 'building' }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  
  // Rotation state: current values and target values for smooth mouse interaction
  const rotationRef = useRef({ x: 0.5, y: 0.8, targetX: 0.5, targetY: 0.8 });

  // Bayer Matrix (4x4) for ordered dithering
  // This is the missing variable that caused the error
  const bayerMatrix = useMemo(() => [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5]
  ], []);

  // Handle mouse movement to rotate the model
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    // Normalize mouse position from 0 to 1
    const x = (e.clientX - rect.left) / rect.width; 
    const y = (e.clientY - rect.top) / rect.height; 
    
    // Map normalized coordinates to rotation angles
    // X controls Yaw (rotate around Y axis)
    // Y controls Pitch (rotate around X axis)
    rotationRef.current.targetY = x * Math.PI * 2;
    rotationRef.current.targetX = y * Math.PI - Math.PI/2;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let width, height;

    // 3D Primitives Definition
    const createCube = (cx, cy, cz, size, heightScale = 1) => {
      const h = size * heightScale;
      const w = size;
      // Vertices
      return [
        { x: cx - w, y: cy - h, z: cz - w }, { x: cx + w, y: cy - h, z: cz - w },
        { x: cx + w, y: cy + h, z: cz - w }, { x: cx - w, y: cy + h, z: cz - w },
        { x: cx - w, y: cy - h, z: cz + w }, { x: cx + w, y: cy - h, z: cz + w },
        { x: cx + w, y: cy + h, z: cz + w }, { x: cx - w, y: cy + h, z: cz + w },
      ];
    };

    const resize = () => {
      const parent = canvas.parentElement;
      width = parent.clientWidth;
      height = parent.clientHeight;
      // Low resolution for clearer pixelation
      canvas.width = width / 2;
      canvas.height = height / 2;
      ctx.imageSmoothingEnabled = false;
    };
    window.addEventListener('resize', resize);
    resize();

    const project = (v, rotX, rotY) => {
      // Simple rotation matrix
      let x = v.x;
      let y = v.y;
      let z = v.z;

      // Rotate Y
      let x1 = x * Math.cos(rotY) - z * Math.sin(rotY);
      let z1 = x * Math.sin(rotY) + z * Math.cos(rotY);
      
      // Rotate X
      let y1 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
      let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);

      // Perspective projection
      const fov = 400;
      const scale = fov / (fov + z2 + 400);
      return {
        x: x1 * scale + canvas.width / 2,
        y: y1 * scale + canvas.height / 2,
        d: z2 // depth for sorting if needed, mostly simple painter's algo here
      };
    };

    const drawFace = (verts, indices, brightness) => {
      ctx.beginPath();
      ctx.moveTo(verts[indices[0]].x, verts[indices[0]].y);
      for (let i = 1; i < indices.length; i++) {
        ctx.lineTo(verts[indices[i]].x, verts[indices[i]].y);
      }
      ctx.closePath();
      // Fill with grayscale based on brightness
      const c = Math.floor(brightness * 255);
      ctx.fillStyle = `rgb(${c},${c},${c})`;
      ctx.fill();
    };

    const animate = (time) => {
      // Clear with black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Smooth Rotation Logic (Linear Interpolation)
      const lerp = (start, end, t) => start * (1 - t) + end * t;
      rotationRef.current.y = lerp(rotationRef.current.y, rotationRef.current.targetY, 0.05);
      rotationRef.current.x = lerp(rotationRef.current.x, rotationRef.current.targetX, 0.05);
      
      // Subtle auto-rotation if idle
      // rotationRef.current.targetY += 0.002; 
      
      // Generate Architecture based on "promptIntensity" (simulated complexity)
      const t = time * 0.001;
      const buildingHeight = 50 + (promptIntensity * 150); 
      
      // Create scene objects
      let cubes = [];
      
      // Main Tower
      cubes.push({
        verts: createCube(0, 0, 0, 40, buildingHeight / 40),
        color: 0.8 // Lightest
      });

      // Satellites (appear based on prompt)
      if (promptIntensity > 0.3) {
        cubes.push({
          verts: createCube(60, 40, 0, 20, 1 + Math.sin(t)*0.2),
          color: 0.5
        });
      }
      if (promptIntensity > 0.6) {
        cubes.push({
          verts: createCube(-50, 20, 50, 25, 2),
          color: 0.6
        });
        cubes.push({
          verts: createCube(-50, -50, -50, 15, 1.5),
          color: 0.4
        });
      }

      // Render Geometry
      cubes.forEach(cube => {
        const projected = cube.verts.map(v => project(v, rotationRef.current.x, rotationRef.current.y));
        
        // Simple Cube Faces (Indices)
        const faces = [
            [0, 1, 2, 3], // Front
            [1, 5, 6, 2], // Right
            [5, 4, 7, 6], // Back
            [4, 0, 3, 7], // Left
            [3, 2, 6, 7], // Top
            [4, 5, 1, 0]  // Bottom
        ];

        // Very basic face culling/sorting (not perfect but good for glitch art style)
        faces.forEach((face, i) => {
           // Rudimentary lighting based on face index
           let light = cube.color;
           if (i === 1) light *= 0.6;
           if (i === 4) light *= 1.2; // Top is bright
           if (i === 3) light *= 0.4;
           
           drawFace(projected, face, Math.min(1, light));
        });
      });


      // --- DITHER PASS ---
      // Get pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;

      for (let y = 0; y < canvas.height; y += 2) { // Skip rows for scanline effect/perf
        for (let x = 0; x < w; x += 2) { // Skip cols for pixelation
           const i = (y * w + x) * 4;
           
           // Grayscale value
           const oldPixel = data[i]; // R channel is enough since it's grayscale
           
           // Bayer Threshold
           const threshold = (bayerMatrix[y % 4][x % 4] / 16) * 255;
           
           // 1-bit quantization
           const newPixel = oldPixel > threshold ? 255 : 0;
           
           // Write to 2x2 block to make pixels chunky
           const i2 = i + 4; 
           const i3 = ((y + 1) * w + x) * 4;
           const i4 = i3 + 4;

           // Set RGBA
           [i, i2, i3, i4].forEach(idx => {
               if(idx < data.length) {
                   data[idx] = newPixel;     // R
                   data[idx+1] = newPixel;   // G
                   data[idx+2] = newPixel;   // B
                   data[idx+3] = 255;        // A
               }
           });
        }
      }
      ctx.putImageData(imageData, 0, 0);
      
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [promptIntensity, bayerMatrix]);

  return (
    <canvas 
        ref={canvasRef} 
        onMouseMove={handleMouseMove}
        className="w-full h-full object-cover mix-blend-screen pointer-events-auto cursor-crosshair"
    />
  );
};


/**
 * MAIN COMPONENT
 */
const SpatialLabs = () => {
  const [promptText, setPromptText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [intensity, setIntensity] = useState(0);

  // Simulated typing effect for the demo
  useEffect(() => {
    const demoPrompt = "Generate a brutalist residential tower, mid-rise, concrete facade...";
    let i = 0;
    
    const typeWriter = () => {
        if (i < demoPrompt.length) {
            setPromptText(demoPrompt.substring(0, i + 1));
            setIntensity((i + 1) / demoPrompt.length);
            i++;
            setTimeout(typeWriter, 50); // Typing speed
        } else {
            setIsTyping(false);
        }
    };

    // Start after a delay
    setTimeout(() => {
        setIsTyping(true);
        typeWriter();
    }, 1500);

  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black overflow-x-hidden">
      
      {/* HEADER */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white" />
            <span className="font-bold tracking-tighter text-lg">Spatial Intelligence Lab</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-mono text-gray-400">
            <a href="#" className="hover:text-white transition-colors">RESEARCH</a>
            <a href="#" className="hover:text-white transition-colors">API</a>
            <a href="#" className="hover:text-white transition-colors">COMPANY</a>
            <a href="#" className="text-white border border-white/20 px-4 py-1 hover:bg-white hover:text-black transition-all">
              ACCESS
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Copy & Input */}
          <div className="space-y-8 z-10">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/20 rounded-full text-xs font-mono text-gray-400 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              SYSTEM ONLINE V2.4
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95]">
              Intelligence for the <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-600">
                Built World.
              </span>
            </h1>
            
            <p className="text-gray-400 text-lg max-w-md leading-relaxed">
              The first spatial reasoning model capable of understanding, generating, and optimizing 3D architecture in real-time.
            </p>

            {/* Interactive Prompt Simulation */}
            <div className="mt-12 border border-white/20 bg-white/5 p-1 relative group focus-within:border-white/60 transition-colors">
                <div className="absolute -top-3 left-4 bg-black px-2 text-xs font-mono text-gray-500">
                    PROMPT ENGINE
                </div>
                <div className="flex items-center gap-3 p-4">
                    <Terminal className="w-5 h-5 text-gray-500" />
                    <input 
                        type="text" 
                        value={promptText}
                        onChange={(e) => {
                            setPromptText(e.target.value);
                            setIntensity(Math.min(1, e.target.value.length / 50));
                        }}
                        placeholder="Describe a structure..."
                        className="bg-transparent border-none outline-none w-full font-mono text-sm text-white placeholder:text-gray-700"
                    />
                    {isTyping && <div className="w-2 h-5 bg-white animate-pulse"/>}
                </div>
                <div className="border-t border-white/10 bg-black/50 p-2 flex justify-between items-center">
                    <div className="flex gap-4 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                        <span>Model: Spatial-XL</span>
                        <span>Latency: 12ms</span>
                    </div>
                    <button className="bg-white text-black p-2 hover:bg-gray-200 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="pt-8 flex flex-wrap gap-8">
                <div className="flex flex-col border-l border-white/20 pl-4">
                    <span className="text-2xl font-bold">100x</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Faster Iteration</span>
                </div>
                <div className="flex flex-col border-l border-white/20 pl-4">
                    <span className="text-2xl font-bold">Native</span>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">IFC / OBJ Export</span>
                </div>
            </div>
          </div>

          {/* Right: Dither Canvas Visual */}
          <div className="relative h-[400px] lg:h-[600px] w-full border border-white/10 bg-black overflow-hidden flex items-center justify-center group">
             {/* Grid Background */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(black,transparent_90%)]" />
             
             {/* The Canvas */}
             <div className="relative z-10 w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500">
                <DitherCanvas promptIntensity={intensity} />
             </div>

             {/* Overlay UI Elements on the Canvas */}
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

      {/* LOGO STRIP */}
      <section className="py-12 border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center md:justify-between items-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
           {['EPFL', 'FOSTER+PARTNERS', 'NVIDIA', 'TUM', 'OMA'].map((logo) => (
               <span key={logo} className="text-lg font-bold font-mono tracking-widest">{logo}</span>
           ))}
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
            <div className="mb-20">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">The new standard for <br/> architectural intelligence.</h2>
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
      <section className="py-32 border-t border-white/10 bg-white text-black">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            <div>
                <h2 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6">
                    BUILD <br/> FASTER.
                </h2>
                <p className="text-xl max-w-md text-gray-600">
                    Join the waitlist for the private beta. 
                    Currently onboarding architectural firms and developers.
                </p>
            </div>
            <div className="w-full md:w-auto">
                 <button className="group flex items-center justify-between w-full md:w-96 px-8 py-6 bg-black text-white hover:bg-gray-900 transition-all">
                    <span className="font-mono text-lg tracking-wider">REQUEST ACCESS</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="mt-4 text-xs font-mono text-gray-500 text-center md:text-right">
                    LIMITED AVAILABILITY Q1 2025
                </p>
            </div>
          </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-12 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs font-mono text-gray-600">
            <div className="flex gap-6 mb-4 md:mb-0">
                <a href="#" className="hover:text-white">TWITTER</a>
                <a href="#" className="hover:text-white">GITHUB</a>
                <a href="#" className="hover:text-white">LINKEDIN</a>
            </div>
            <div>
                © 2025 SPATIAL LABS INC. ALL SYSTEMS NOMINAL.
            </div>
          </div>
      </footer>

    </div>
  );
};

export default SpatialLabs;