"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function FloatingPaths({ position, count, isMobile }: { position: number; count: number; isMobile: boolean }) {
    const paths = Array.from({ length: count }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: isMobile ? 0.8 + i * 0.06 : 0.5 + i * 0.03,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="w-full h-full"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="currentColor"
                        strokeWidth={path.width}
                        strokeOpacity={isMobile ? 0.35 + path.id * 0.04 : 0.15 + path.id * 0.03}
                        initial={{ pathLength: 0.3, opacity: isMobile ? 0.8 : 0.6 }}
                        animate={{
                            pathLength: 1,
                            opacity: isMobile ? [0.5, 0.9, 0.5] : [0.3, 0.6, 0.3],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: isMobile ? 15 + Math.random() * 8 : 20 + Math.random() * 10,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

export function BackgroundPaths() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

    const pathCount = isMobile ? 24 : 36;

    return (
        <div className={`absolute inset-0 ${isMobile ? 'text-primary-foreground/70' : 'text-primary-foreground/40'}`}>
            <FloatingPaths position={1} count={pathCount} isMobile={isMobile} />
            <FloatingPaths position={-1} count={pathCount} isMobile={isMobile} />
        </div>
    );
}
