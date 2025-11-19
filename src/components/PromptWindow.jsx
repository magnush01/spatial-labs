import React, { useState, useEffect } from 'react';
import { Terminal, ArrowRight } from 'lucide-react';

const PromptWindow = ({ onPromptUpdate }) => {
    const [promptText, setPromptText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [thinkingTime, setThinkingTime] = useState("0.000");

    // Notify parent of text changes
    useEffect(() => {
        if (onPromptUpdate) {
            onPromptUpdate(promptText);
        }
    }, [promptText, onPromptUpdate]);

    // Stages: 0: hidden, 1: grid expands, 2: border appears, 3: content fades in
    const [windowStage, setWindowStage] = useState(0);

    // 1. Animation Sequence
    useEffect(() => {
        // Start expansion almost immediately
        const s1 = setTimeout(() => setWindowStage(1), 50);
        // As soon as expansion finishes (approx 1s), fade in border/fade out grid
        const s2 = setTimeout(() => setWindowStage(2), 1050);
        // Show content shortly after
        const s3 = setTimeout(() => setWindowStage(3), 1400);

        return () => { clearTimeout(s1); clearTimeout(s2); clearTimeout(s3); };
    }, []);

    // 2. Simulated Typing Effect (Optional - for demo purposes)
    useEffect(() => {
        const demoPrompt = "Neue National Galerie by Mies Van der Rohe";
        let typeTimeout;
        let thinkInterval;

        const startThinking = () => {
            const startTime = Date.now();
            thinkInterval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                setThinkingTime(elapsed.toFixed(3));
            }, 33);
        };

        let charIndex = 0;
        const type = () => {
            if (charIndex <= demoPrompt.length) {
                setPromptText(demoPrompt.substring(0, charIndex));
                charIndex++;
                typeTimeout = setTimeout(type, 50);
            } else {
                setIsTyping(false);
                startThinking();
            }
        };

        // Start typing after the window is fully ready
        const startDelay = setTimeout(() => {
            setIsTyping(true);
            type();
        }, 1600);

        return () => {
            clearTimeout(startDelay);
            clearTimeout(typeTimeout);
            clearInterval(thinkInterval);
        };
    }, []);

    return (
        <div className="w-full max-w-xl mx-auto">
            {/* 
        Main Container 
        - Controls the border fade-in
        - Uses custom cubic-bezier for smooth motion
      */}
            <div className={`relative transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)]
          ${windowStage >= 2 ? 'border border-white/20 bg-white/5' : 'border border-transparent'}
      `}>

                {/* 
          Grid Animation Layer 
          - Uses mask-image and mask-size to expand from center
          - Scales up slightly (scale-90 -> scale-100) for "pop" effect
        */}
                <div
                    className={`absolute inset-0 pointer-events-none transition-all duration-[1000ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[mask-size,opacity,transform]
              bg-[linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[size:20px_20px]
              ${windowStage === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
          `}
                    style={{
                        // Gradient mask for soft edges
                        maskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
                        // Animate from a thin strip (0% width, 40% height) to full size
                        maskSize: windowStage === 0 ? '0% 40%' : '100% 100%',
                        WebkitMaskSize: windowStage === 0 ? '0% 40%' : '100% 100%',
                        maskPosition: 'center',
                        WebkitMaskPosition: 'center',
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat'
                    }}
                />

                {/* 
          Main Content 
          - Fades in and slides up slightly
        */}
                <div className={`transition-all duration-[1000ms] ease-out ${windowStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                    {/* Label Badge */}
                    <div className="absolute -top-3 left-4 bg-black px-2 text-xs font-mono text-gray-500">
                        PROMPT ENGINE
                    </div>

                    {/* Input Area */}
                    <div className="flex items-center gap-3 p-4">
                        <Terminal className="w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={promptText}
                            readOnly
                            placeholder="Enter prompt..."
                            className="bg-transparent border-none outline-none w-full font-mono text-sm text-white placeholder:text-gray-700"
                        />
                        {isTyping && <div className="w-2 h-5 bg-white animate-pulse" />}
                    </div>

                    {/* Footer / Status Bar */}
                    <div className="border-t border-white/10 bg-black/50 p-2 flex justify-between items-center">
                        <div className="flex gap-4 text-[10px] text-gray-600 font-mono uppercase tracking-widest">
                            <span>Model: MCG-1</span>
                            <span>Thinking: {thinkingTime}s</span>
                        </div>
                        <button className="bg-white text-black p-2 hover:bg-gray-200 transition-colors">
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PromptWindow;
