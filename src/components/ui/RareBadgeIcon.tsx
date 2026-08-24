import React from 'react';
import { motion } from 'framer-motion';

interface RareBadgeIconProps extends React.SVGProps<SVGSVGElement> {
  animated?: boolean;
}

export function RareBadgeIcon({ animated = true, className = '', ...props }: RareBadgeIconProps) {
  return (
    <svg 
      width='24' 
      height='24' 
      viewBox='0 0 24 24' 
      fill='none' 
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id='rare-gradient' x1='12' y1='2' x2='12' y2='22' gradientUnits='userSpaceOnUse'>
          <stop stopColor='currentColor' stopOpacity='1' />
          <stop offset='1' stopColor='currentColor' stopOpacity='0.4' />
        </linearGradient>
        <filter id='rare-glow' x='-20%' y='-20%' width='140%' height='140%'>
          <feGaussianBlur stdDeviation='1.5' result='blur' />
          <feComposite in='SourceGraphic' in2='blur' operator='over' />
        </filter>
      </defs>
      
      {/* Outer Geometric Shell (Hexagon/Diamond hybrid) */}
      <motion.path 
        d='M12 2L20 7V17L12 22L4 17V7L12 2Z' 
        stroke='url(#rare-gradient)' 
        strokeWidth='1.5' 
        strokeLinecap='round' 
        strokeLinejoin='round'
        fill='currentColor'
        fillOpacity='0.05'
        filter='url(#rare-glow)'
        initial={animated ? { rotate: 0 } : false}
        animate={animated ? { rotate: [0, 2, -2, 0] } : false}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Inner Floating Crystal Core */}
      <motion.path 
        d='M12 6L16 10L12 18L8 10L12 6Z' 
        fill='currentColor'
        fillOpacity='0.9'
        initial={animated ? { scale: 0.9, opacity: 0.7 } : false}
        animate={animated ? { scale: [0.9, 1.1, 0.9], opacity: [0.7, 1, 0.7] } : false}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Center Shine Star / Highlight */}
      <motion.path 
        d='M12 8L12.5 10.5L15 11L12.5 11.5L12 14L11.5 11.5L9 11L11.5 10.5L12 8Z' 
        fill='white'
        initial={animated ? { rotate: 0, scale: 0.8 } : false}
        animate={animated ? { rotate: 180, scale: [0.8, 1.2, 0.8] } : false}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </svg>
  );
}
