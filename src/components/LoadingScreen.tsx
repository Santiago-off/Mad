'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.8, ease: "easeInOut" }
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
        >
          {/* Background Glitch Effect */}
          <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(0,255,0,0.06),rgba(0,255,0,0.02),rgba(0,255,0,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />
          </div>

          <div className="relative flex flex-col items-center">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.1, 1],
                opacity: 1 
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-8"
            >
              <Image
                src="/logo.png"
                alt="MAD Agency Logo"
                width={250}
                height={250}
                priority
                style={{ background: 'transparent' }}
              />
            </motion.div>

            {/* Loading Bar Container */}
            <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary"
              />
            </div>

            {/* Loading Text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="mt-6 text-center text-xs font-mono uppercase tracking-[0.3em] text-[#00ff00]/50"
            >
              Initializing Systems...
            </motion.div>
          </div>

          {/* Corner Decorations */}
          <div className="absolute top-10 left-10 w-12 h-12 border-t-2 border-l-2 border-[#00ff00]/30" />
          <div className="absolute top-10 right-10 w-12 h-12 border-t-2 border-r-2 border-[#00ff00]/30" />
          <div className="absolute bottom-10 left-10 w-12 h-12 border-b-2 border-l-2 border-[#00ff00]/30" />
          <div className="absolute bottom-10 right-10 w-12 h-12 border-b-2 border-r-2 border-[#00ff00]/30" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
