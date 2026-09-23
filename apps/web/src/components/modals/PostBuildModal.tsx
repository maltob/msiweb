import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Folder,
  ShieldAlert,
  X
} from 'lucide-react';
import { BuildResult, MsiBuilderProject } from '../../types/models';
import { formatBytes } from '../../utils/guid';

interface PostBuildModalProps {
  buildResult: BuildResult;
  project?: MsiBuilderProject;
  msiBlob: Blob;
  onClose: () => void;
}

export const PostBuildModal: React.FC<PostBuildModalProps> = ({
  buildResult,
  project,
  msiBlob,
  onClose,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState(false);

  const copySha = async () => {
    await navigator.clipboard.writeText(buildResult.sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const msiexecCmd = `msiexec /i "${buildResult.file_name}" /l*v install.log`;

  const copyCommand = async () => {
    await navigator.clipboard.writeText(msiexecCmd);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const handleDownload = async () => {
    // 1. Try modern File System Access API (showSaveFilePicker)
    // @ts-ignore
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: buildResult.file_name,
          types: [
            {
              description: 'Windows Installer Package (*.msi)',
              accept: { 'application/x-msi': ['.msi'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(msiBlob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker failed or cancelled, falling back to standard download:', err);
      }
    }

    // 2. Fallback: Blob URL download
    const url = URL.createObjectURL(msiBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildResult.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-xl p-6 space-y-6 shadow-2xl shadow-emerald-500/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                MSI Built Successfully!
              </h3>
              <p className="text-xs text-slate-400">
                All processing occurs local to the browser. Zero server uploads.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File & Metrics */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Package File:</span>
            <span className="text-xs font-mono font-bold text-slate-200">
              {buildResult.file_name}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Binary Size:</span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {formatBytes(buildResult.size)} ({buildResult.size.toLocaleString()} bytes)
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>SHA-256 Checksum:</span>
              <button
                onClick={copySha}
                className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition"
                title="Copy SHA-256"
              >
                {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[11px] font-mono">{copiedSha ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-300 break-all bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 select-all">
              {buildResult.sha256}
            </div>
          </div>
        </div>

        {/* Table summary stats */}
        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-base font-bold text-slate-100">
              {buildResult.metadata.file_count}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Files</div>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-base font-bold text-slate-100">
              {buildResult.metadata.component_count}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Components</div>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-base font-bold text-slate-100">
              {buildResult.metadata.shortcut_count}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Shortcuts</div>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-base font-bold text-slate-100">
              {buildResult.metadata.registry_count}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Registry</div>
          </div>

          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="text-base font-bold text-slate-100">
              {buildResult.metadata.service_count}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Services</div>
          </div>
        </div>

        {/* Install Location Info */}
        {project && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-brand-400" />
                <span>Installed File Destination:</span>
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                project.package.install_context === 'perMachine'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {project.package.install_context === 'perMachine' ? 'Per-Machine (Program Files)' : 'Per-User (LocalAppData)'}
              </span>
            </div>
            <div className="font-mono text-xs text-brand-200 bg-slate-900 px-3 py-2 rounded border border-slate-800 break-all select-all">
              {project.package.install_context === 'perMachine'
                ? `C:\\Program Files\\${project.package.manufacturer || 'Company'}\\${project.package.install_subdirectory || 'App'}\\`
                : `%LOCALAPPDATA%\\${project.package.manufacturer || 'Company'}\\${project.package.install_subdirectory || 'App'}\\`}
            </div>
            {project.package.install_context === 'perMachine' ? (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-300/90 leading-relaxed bg-amber-950/20 border border-amber-900/30 p-2 rounded">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Elevation Required:</strong> Writing to <code>C:\Program Files</code> requires administrator privileges. Double-clicking in Explorer prompts UAC; when testing in PowerShell or CMD, ensure your terminal is opened with <strong>"Run as Administrator"</strong>.
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>Tip:</strong> AppData is hidden in File Explorer by default. Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">Win+R</kbd> and paste the path above to open it.
              </p>
            )}
          </div>
        )}

        {/* msiexec testing helper snippet */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Terminal className="w-3.5 h-3.5" />
              <span>Windows CLI Test Command:</span>
            </span>
            <button
              onClick={copyCommand}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              {copiedCommand ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCommand ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 font-mono text-xs text-brand-300 select-all">
            {msiexecCmd}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 rounded-lg transition shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download .msi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
