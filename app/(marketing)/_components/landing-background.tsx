"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const particles = Array.from({ length: 26 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 53) % 100}%`,
  delay: (index % 9) * 0.35,
  size: 2 + (index % 3),
}));

export function LandingBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 70, damping: 22 });
  const smoothY = useSpring(mouseY, { stiffness: 70, damping: 22 });

  useEffect(() => {
    const updateMouse = (event: MouseEvent) => {
      mouseX.set(event.clientX - 192);
      mouseY.set(event.clientY - 192);
    };

    window.addEventListener("mousemove", updateMouse);
    return () => window.removeEventListener("mousemove", updateMouse);
  }, [mouseX, mouseY]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#03050b]">
      <motion.div
        className="absolute inset-0 opacity-[0.42]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.12) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(circle at center, black 0%, black 42%, transparent 82%)",
        }}
        animate={{ backgroundPosition: ["0px 0px", "72px 72px"] }}
        transition={{ duration: 24, ease: "linear", repeat: Infinity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(168,85,247,0.16),transparent_28%),radial-gradient(circle_at_15%_82%,rgba(16,185,129,0.12),transparent_30%)]" />
      <motion.div
        className="absolute h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl"
        style={{ x: smoothX, y: smoothY }}
      />
      <div
        className="absolute inset-0 opacity-[0.075] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.58'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#03050b]/15 to-[#03050b]" />
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-cyan-200/70 shadow-[0_0_18px_rgba(125,211,252,0.8)]"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={{ opacity: [0.15, 0.9, 0.15], y: [0, -18, 0] }}
          transition={{
            duration: 4.5 + (particle.id % 5),
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
