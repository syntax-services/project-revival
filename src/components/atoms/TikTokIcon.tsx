import React from "react";

interface TikTokIconProps {
  className?: string;
  size?: number;
}

export const TikTokIcon: React.FC<TikTokIconProps> = ({ className = "w-5 h-5", size }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-2.891 2.887 2.894 2.894 0 0 1-2.891-2.887 2.895 2.895 0 0 1 2.891-2.888c.328 0 .64.048.937.136V9.458a6.34 6.34 0 0 0-.937-.07 6.338 6.338 0 0 0-6.337 6.335 6.338 6.338 0 0 0 6.337 6.335 6.339 6.339 0 0 0 6.337-6.335V9.429a8.163 8.163 0 0 0 4.887 1.602V7.591a4.814 4.814 0 0 1-1.118-.905z" />
    </svg>
  );
};
