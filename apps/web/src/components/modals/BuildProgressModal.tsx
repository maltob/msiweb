import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { InstallerCompilerIcon } from '../icons/CustomIcons';
import { BuildProgress } from '../../types/models';

interface BuildProgressModalProps {
  progress: BuildProgress | null;
  onCancel: () => void;
}

export const BuildProgressModal: React.FC<BuildProgressModalProps> = ({ progress, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl text-center">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <InstallerCompilerIcon className="w-7 h-7 text-brand-400" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-100">
            Building Windows Installer (.msi)
          </h3>
          <p className="text-xs text-slate-400">
            {progress?.message || 'Compiling in WebAssembly dedicated worker...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress?.current || 10}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>All processing occurs local to the browser</span>
            <span>{progress?.current || 10}%</span>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-lg">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Zero network traffic • Pure OPFS WebAssembly</span>
        </div>

        <div className="pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            Cancel Build
          </button>
        </div>
      </div>
    </div>
  );
};
