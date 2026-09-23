import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * Main Web MSI Builder Brand Logo
 * Isometric Windows Installer package with modern gradients and installer emblem
 */
export const MsiLogoIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      <linearGradient id="msiTop" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4ade80" />
        <stop offset="100%" stop-color="#22c55e" />
      </linearGradient>
      <linearGradient id="msiLeft" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#16a34a" />
        <stop offset="100%" stop-color="#15803d" />
      </linearGradient>
      <linearGradient id="msiRight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#15803d" />
        <stop offset="100%" stop-color="#166534" />
      </linearGradient>
      <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#38bdf8" />
        <stop offset="100%" stop-color="#0284c7" />
      </linearGradient>
    </defs>

    {/* Isometric Package Box */}
    {/* Top Face */}
    <path
      d="M16 4.5 L26.5 10.5 L16 16.5 L5.5 10.5 Z"
      fill="url(#msiTop)"
      stroke="#86efac"
      strokeWidth="0.75"
      strokeLinejoin="round"
    />
    {/* Left Face */}
    <path
      d="M5.5 10.5 L16 16.5 L16 27.5 L5.5 21.5 Z"
      fill="url(#msiLeft)"
      stroke="#16a34a"
      strokeWidth="0.75"
      strokeLinejoin="round"
    />
    {/* Right Face */}
    <path
      d="M16 16.5 L26.5 10.5 L26.5 21.5 L16 27.5 Z"
      fill="url(#msiRight)"
      stroke="#15803d"
      strokeWidth="0.75"
      strokeLinejoin="round"
    />

    {/* Box Tape / Fold Accent */}
    <path
      d="M13.8 5.8 L18.2 8.3 L18.2 15.2 L13.8 12.7 Z"
      fill="#ffffff"
      fillOpacity="0.22"
    />

    {/* Front Left Windows Tile Grid */}
    <g transform="translate(8.5, 16.5) skewY(-28) scale(0.42)">
      <rect x="0" y="0" width="4.5" height="4.5" rx="0.6" fill="#38bdf8" />
      <rect x="6" y="0" width="4.5" height="4.5" rx="0.6" fill="#4ade80" />
      <rect x="0" y="6" width="4.5" height="4.5" rx="0.6" fill="#fbbf24" />
      <rect x="6" y="6" width="4.5" height="4.5" rx="0.6" fill="#f87171" />
    </g>

    {/* Front Right Arrow Indicator */}
    <g transform="translate(19.5, 17) skewY(28) scale(0.45)">
      <path
        d="M5 2 L5 10 M2 7 L5 10 L8 7"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />
    </g>
  </svg>
);

/**
 * Custom Windows Shortcut Icon
 * Replaces generic Share2 icon with an authentic application file tile featuring the classic curved shortcut jump-arrow
 */
export const WindowsShortcutIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Base Document / App Tile */}
    <path d="M15 2H6a2 2 0 0 0-2 2v10" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M20 8v12a2 2 0 0 1-2 2H10" />

    {/* Shortcut Arrow Badge Overlay */}
    <rect x="2" y="12" width="10" height="10" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5" />
    {/* Curved Shortcut Arrow pointing up-right */}
    <path
      d="M4.5 19.5 C4.5 16.5, 6.5 14.5, 9.5 14.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M7 14.5 H9.5 V17"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Custom Windows Registry Icon
 * Replaces generic Database icon with the iconic 3D Windows Registry Editor cube cluster (regedit)
 */
export const WindowsRegistryIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Bottom Left Cube */}
    <path d="M3 15 L7.5 12.5 L12 15 L7.5 17.5 Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M3 15 V19.5 L7.5 22 V17.5" />
    <path d="M7.5 22 L12 19.5 V15" />

    {/* Bottom Right Cube */}
    <path d="M12 15 L16.5 12.5 L21 15 L16.5 17.5 Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M12 15 V19.5 L16.5 22 V17.5" />
    <path d="M16.5 22 L21 19.5 V15" />

    {/* Top Base Cube */}
    <path d="M7.5 8.5 L12 6 L16.5 8.5 L12 11 Z" fill="currentColor" fillOpacity="0.25" />
    <path d="M7.5 8.5 V13 L12 15.5 V11" />
    <path d="M12 15.5 L16.5 13 V8.5" />

    {/* Floating Top-Left Cube (Quintessential Registry Key in motion) */}
    <g transform="translate(-1, -1)">
      <path d="M3 5.5 L7.5 3 L12 5.5 L7.5 8 Z" fill="currentColor" fillOpacity="0.35" strokeWidth="1.8" />
      <path d="M3 5.5 V9.5 L7.5 12 V8" strokeWidth="1.8" />
      <path d="M7.5 12 L12 9.5 V5.5" strokeWidth="1.8" />
    </g>
  </svg>
);

/**
 * Custom Windows Services Icon
 * Replaces generic Server with a precision dual-gear system daemon icon
 */
export const WindowsServiceIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* Large Service Cog */}
    <circle cx="10" cy="10" r="3" fill="currentColor" fillOpacity="0.1" />
    <path d="M10 2v2 M10 16v2 M2 10h2 M16 10h2 M4.34 4.34l1.42 1.42 M14.24 14.24l1.42 1.42 M4.34 15.66l1.42-1.42 M14.24 5.76l1.42-1.42" />
    
    {/* Small Interlocking Gear */}
    <circle cx="17.5" cy="17.5" r="2" fill="currentColor" fillOpacity="0.15" />
    <path d="M17.5 13.5v1 M17.5 20.5v1 M13.5 17.5h1 M20.5 17.5h1 M14.7 14.7l.7.7 M19.6 19.6l.7.7 M14.7 20.3l.7-.7 M19.6 15.4l.7-.7" strokeWidth="1.75" />
  </svg>
);

/**
 * Custom Package Manifest Icon
 * Represents the MSI Product metadata and architecture definition
 */
export const MsiPackageManifestIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {/* 3D Box with Windows badge */}
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 12v10" />
    {/* Front badge accent */}
    <path d="M7 14.5l2.5 1.5v3L7 17.5z" fill="currentColor" fillOpacity="0.25" strokeWidth="1.2" />
  </svg>
);

/**
 * Custom Installer Compiler Icon
 * Replaces Hammer in the building modal
 */
export const InstallerCompilerIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 12v10" />
    {/* Glowing down arrow */}
    <path d="M12 3v5 M9.5 5.5L12 8l2.5-2.5" stroke="currentColor" strokeWidth="2.2" />
  </svg>
);
