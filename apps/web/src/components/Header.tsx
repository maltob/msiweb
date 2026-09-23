import React from 'react';
import { 
  ShieldCheck, 
  Download, 
  Upload, 
  HardDrive, 
  CheckCircle2, 
  Cpu, 
  Sparkles,
  AlertTriangle 
} from 'lucide-react';
import { MsiBuilderProject, ValidationReport } from '../types/models';
import { getArchitectureProfile } from '../types/architectures';
import { MsiLogoIcon } from './icons/CustomIcons';

interface HeaderProps {
  project: MsiBuilderProject;
  validationReport: ValidationReport;
  isBuilding: boolean;
  onValidate: () => void;
  onBuild: () => void;
  onExport: () => void;
  onImport: () => void;
  onOpenStorage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  validationReport,
  isBuilding,
  onValidate,
  onBuild,
  onExport,
  onImport,
  onOpenStorage,
}) => {
  const archProfile = getArchitectureProfile(project.package.architecture_id);

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo and Titles */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 shadow-lg shadow-brand-500/10 p-1">
            <MsiLogoIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">Web MSI Builder</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                v0.1.0-wasm
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>{project.package.product_name || 'Untitled Package'}</span>
              <span>•</span>
              <span className="font-mono text-slate-300">v{project.package.version}</span>
            </div>
          </div>
        </div>

        {/* Badges: Privacy & Architecture */}
        <div className="flex items-center space-x-3">
          {/* Privacy Badge */}
          <div 
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            title="All compilation, cabinet compression, and file I/O runs purely in your local browser WebAssembly & OPFS sandbox. Zero bytes are uploaded to any server."
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>All processing occurs local to the browser • Zero Uploads</span>
          </div>

          {/* Architecture Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>{archProfile.name.split(' ')[0]}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Project Archive Import/Export */}
          <button
            onClick={onImport}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-lg transition"
            title="Import project from .msibuilder archive"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-lg transition"
            title="Export project and payloads to .msibuilder ZIP64 archive"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={onOpenStorage}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded-lg transition"
            title="Manage OPFS payload cache and quota"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Storage</span>
          </button>

          {/* Validate */}
          <button
            onClick={onValidate}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
              validationReport.is_valid
                ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-750 border-slate-700'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {validationReport.is_valid ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {validationReport.is_valid
                ? 'Valid'
                : `${validationReport.errors.length} Issues`}
            </span>
          </button>

          {/* Build MSI Button */}
          <button
            onClick={onBuild}
            disabled={isBuilding || !validationReport.is_valid}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-lg transition select-none ${
              isBuilding
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : !validationReport.is_valid
                ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-bold shadow-emerald-500/25 cursor-pointer'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isBuilding ? 'Building...' : 'Build MSI'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
