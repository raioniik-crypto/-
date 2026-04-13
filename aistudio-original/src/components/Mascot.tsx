import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface MascotProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Mascot: React.FC<MascotProps> = ({ message, className = "", size = 'md' }) => {
  const [isWinking, setIsWinking] = useState(false);

  const handleInteraction = () => {
    setIsWinking(true);
    setTimeout(() => setIsWinking(false), 800);
  };

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24 md:w-32 md:h-32',
    lg: 'w-32 h-32 md:w-40 md:h-40'
  };

  return (
    <div className={`relative flex items-end gap-4 ${className}`}>
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10, x: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-full left-0 mb-4 bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20 min-w-[180px]"
          >
            <p className="text-xs font-black leading-tight text-black">{message}</p>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-4 left-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black"></div>
            <div className="absolute -bottom-2 left-[42px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        onClick={handleInteraction}
        animate={{ 
          y: [0, -12, 0],
          rotate: [0, -5, 5, 0]
        }}
        transition={{ 
          duration: 2.5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        whileHover={{ scale: 1.1, rotate: 10 }}
        whileTap={{ scale: 0.9 }}
        className={`relative ${sizeClasses[size]} shrink-0 cursor-pointer group`}
      >
        {/* Shadow */}
        <div className="absolute inset-x-2 -bottom-2 h-4 bg-black/10 rounded-full blur-md"></div>
        
        {/* Mascot Body (Custom Pop SVG) */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          {/* Main Body - A quirky rounded square/circle hybrid */}
          <rect x="10" y="20" width="80" height="70" rx="30" fill="#00E5FF" stroke="black" strokeWidth="4" />
          
          {/* Top "Hair" / Antenna */}
          <motion.path 
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 1, repeat: Infinity }}
            d="M50 20 L50 5 M45 5 L55 5" 
            stroke="black" 
            strokeWidth="4" 
            strokeLinecap="round" 
            style={{ originX: "50px", originY: "20px" }}
          />
          <circle cx="50" cy="5" r="4" fill="#FF4081" stroke="black" strokeWidth="2" />

          {/* Face Screen */}
          <rect x="25" y="35" width="50" height="35" rx="10" fill="white" stroke="black" strokeWidth="3" />
          
          {/* Eyes */}
          {isWinking ? (
            <>
              <path d="M35 50 Q40 45 45 50" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" />
              <path d="M55 50 L65 50" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="40" cy="50" r="5" fill="black" />
              <circle cx="60" cy="50" r="5" fill="black" />
            </>
          )}
          
          {/* Mouth */}
          <path 
            d={isWinking ? "M45 62 Q50 68 55 62" : "M45 60 Q50 65 55 60"} 
            fill="none" 
            stroke="black" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
          
          {/* Blush */}
          <circle cx="30" cy="58" r="3" fill="#FF80AB" opacity="0.6" />
          <circle cx="70" cy="58" r="3" fill="#FF80AB" opacity="0.6" />

          {/* Side Buttons/Ears */}
          <circle cx="10" cy="55" r="6" fill="#FFD600" stroke="black" strokeWidth="3" />
          <circle cx="90" cy="55" r="6" fill="#FFD600" stroke="black" strokeWidth="3" />
          
          {/* Sparkles */}
          <motion.g
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <path d="M85 15 L90 20 M90 15 L85 20" stroke="#FF4081" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 15 L20 20 M20 15 L15 20" stroke="#FFD600" strokeWidth="2" strokeLinecap="round" />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
};