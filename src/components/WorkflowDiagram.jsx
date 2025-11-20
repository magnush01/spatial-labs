import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Box, CheckCircle, FileJson, Brain, Sun, RefreshCw } from 'lucide-react';

const WorkflowDiagram = () => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const sequence = async () => {
            setStep(0);
            await new Promise(r => setTimeout(r, 500));

            for (let i = 1; i <= 9; i++) {
                setStep(i);
                await new Promise(r => setTimeout(r, 800));
            }

            await new Promise(r => setTimeout(r, 2000));
            sequence();
        };

        sequence();
    }, []);

    return (
        <section className="py-32 bg-black border-b border-white/10 relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                {/* Header */}
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-bold mb-4 tracking-tight"
                    >
                        Agentic Workflow
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-400"
                    >
                        Introducing Multi Cognition Feedback Agents
                    </motion.p>
                </div>

                {/* Main Workflow */}
                <div className="relative bg-[#0A0A0A] border border-white/10 p-8 pb-24">
                    <div className="flex items-center justify-center gap-0 flex-wrap lg:flex-nowrap relative z-20">

                        {/* INPUTS */}
                        <div className="relative z-10">
                            <NodeCard icon={<FileText className="w-4 h-4" />} label="INPUTS" active={step >= 1} />
                        </div>

                        {/* Stream 1 */}
                        <ParticleStream active={step >= 2} width={100} />

                        {/* MCG-1 */}
                        <div className="relative z-10">
                            <NodeCard icon={<Brain className="w-4 h-4" />} label="MCG-1" subtitle="Reasoning" active={step >= 3} primary />
                            <TargetedFeedbackLoop active={step >= 3} type="down" height={96} />
                            <TargetedFeedbackLoop active={step >= 3} type="up" delay={0.5} height={96} />
                        </div>

                        {/* Stream 2 */}
                        <ParticleStream active={step >= 4} width={100} />

                        {/* GEOMETRY */}
                        <div className="relative z-10">
                            <NodeCard icon={<Box className="w-4 h-4" />} label="GEOMETRY" subtitle="3D Engine" active={step >= 5} />
                            <TargetedFeedbackLoop active={step >= 5} type="down" height={96} />
                            <TargetedFeedbackLoop active={step >= 5} type="up" delay={0.5} height={96} />
                        </div>

                        {/* Stream 3 */}
                        <ParticleStream active={step >= 6} width={100} />

                        {/* PHYSICS */}
                        <div className="relative z-10">
                            <NodeCard icon={<Sun className="w-4 h-4" />} label="VALIDATE" subtitle="Physics" active={step >= 7} />
                            <TargetedFeedbackLoop active={step >= 7} type="down" height={96} />
                            <TargetedFeedbackLoop active={step >= 7} type="up" delay={0.5} height={96} />
                        </div>

                        {/* Stream 4 */}
                        <ParticleStream active={step >= 8} width={100} />

                        {/* OUTPUT */}
                        <div className="relative z-10">
                            <NodeCard icon={<CheckCircle className="w-4 h-4" />} label="OUTPUT" active={step >= 9} success />
                        </div>

                    </div>
                </div>

                {/* Agent Feedback Loop Layer */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative bg-[#0A0A0A] border border-white/10 border-t-0 p-6 z-20"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <motion.div
                                className="p-2 bg-white/5 border border-white/10"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            >
                                <RefreshCw className="w-4 h-4 text-green-500" />
                            </motion.div>
                            <div>
                                <div className="text-xs font-mono font-bold text-white tracking-wider">FEEDBACK AGENTS</div>
                                <div className="text-[10px] text-gray-500 font-mono">Multi-Cognition Loop</div>
                            </div>
                        </div>

                        {/* Agents aligned with nodes above */}
                        <div className="flex items-center gap-[140px] mr-[40px] relative">
                            {/* Connecting lines background */}
                            <div className="absolute -top-6 left-0 w-full h-px bg-transparent" />

                            <div className="relative">
                                <AgentBadge label="STRUCTURAL" active={step >= 3} />
                                {step >= 3 && <ActiveConnectionIndicator />}
                            </div>

                            <div className="relative">
                                <AgentBadge label="AESTHETIC" active={step >= 5} />
                                {step >= 5 && <ActiveConnectionIndicator />}
                            </div>

                            <div className="relative">
                                <AgentBadge label="COMPLIANCE" active={step >= 7} />
                                {step >= 7 && <ActiveConnectionIndicator />}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <InfoCard icon={<FileText className="w-4 h-4" />} label="Input Sources" value="NL, GIS, Code" />
                    <InfoCard icon={<Brain className="w-4 h-4" />} label="Processing Time" value="< 20 seconds" />
                    <InfoCard icon={<FileJson className="w-4 h-4" />} label="Output Format" value="IFC, JSON, PNG" />
                </div>

            </div>
        </section>
    );
};

const NodeCard = ({ icon, label, subtitle, active, primary, success }) => (
    <div className={`
    relative px-4 py-3 border transition-all z-20
    ${primary ? 'bg-white/5 border-white/30' : 'bg-black border-white/20'}
    ${success ? 'border-green-500/50' : ''}
    min-w-[110px]
  `}>
        <div className="flex items-center gap-2">
            <div className={`p-1.5 ${primary ? 'bg-white/10' : 'bg-white/5'}`}>{icon}</div>
            <div>
                <div className="text-[10px] font-mono font-bold text-white tracking-wider">{label}</div>
                {subtitle && <div className="text-[9px] text-gray-500 font-mono">{subtitle}</div>}
            </div>
        </div>
        {active && (
            <motion.div className="absolute inset-0 border border-white/40"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
            />
        )}
    </div>
);

const ParticleStream = ({ active, width = 100 }) => {
    const particles = Array.from({ length: 8 }).map((_, i) => ({
        id: i,
        delay: i * 0.1,
        duration: 1
    }));

    return (
        <div
            className="relative h-px bg-white/10 overflow-hidden hidden lg:block -mx-px"
            style={{ width }}
        >
            {active && particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: width + 10, opacity: [0, 1, 1, 0] }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: "linear"
                    }}
                />
            ))}
        </div>
    );
};

const TargetedFeedbackLoop = ({ active, type, delay = 0, height = 64 }) => {
    const particles = Array.from({ length: 5 }).map((_, i) => ({
        id: i,
        delay: i * 0.2 + delay
    }));

    return (
        <div
            className="absolute left-1/2 -translate-x-1/2 w-px pointer-events-none overflow-hidden z-10"
            style={{
                height: height,
                top: '100%',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.05))'
            }}
        >
            {active && particles.map((p) => (
                <motion.div
                    key={p.id}
                    className={`absolute left-1/2 -translate-x-1/2 w-1 h-1 rounded-full shadow-sm
            ${type === 'down' ? 'bg-blue-400' : 'bg-green-400'}
          `}
                    initial={{ y: type === 'down' ? -10 : height + 10, opacity: 0 }}
                    animate={{ y: type === 'down' ? height + 10 : -10, opacity: [0, 1, 1, 0] }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: "linear"
                    }}
                />
            ))}
        </div>
    );
};

const ActiveConnectionIndicator = () => (
    <motion.div
        className="absolute -top-8 left-1/2 -translate-x-1/2 w-px h-8 bg-gradient-to-b from-transparent to-green-500/50"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 32 }}
        transition={{ duration: 0.5 }}
    />
);

const AgentBadge = ({ label, active }) => (
    <motion.div
        className={`px-3 py-1.5 border text-[10px] font-mono transition-all relative
      ${active ? 'bg-white/10 border-white/30 text-white' : 'bg-black border-white/10 text-gray-600'}
    `}
    >
        {label}
        {active && (
            <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)]"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.8, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            />
        )}
    </motion.div>
);

const InfoCard = ({ icon, label, value }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-black border border-white/10 p-4 hover:border-white/20 transition-colors"
    >
        <div className="flex items-center gap-2 mb-2 text-gray-500">
            {icon}
            <span className="text-[10px] font-mono uppercase">{label}</span>
        </div>
        <div className="text-sm font-mono font-bold text-white">{value}</div>
    </motion.div>
);

export default WorkflowDiagram;
