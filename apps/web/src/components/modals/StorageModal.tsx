import React, { useState, useEffect } from 'react';
import { X, HardDrive, Trash2, RefreshCw } from 'lucide-react';
import { PayloadRepository } from '../../storage/payloadRepository';
import { formatBytes } from '../../utils/guid';
import { MsiBuilderProject } from '../../types/models';

interface StorageModalProps {
  project: MsiBuilderProject;
  onClose: () => void;
}

export const StorageModal: React.FC<StorageModalProps> = ({ project, onClose }) => {
  const [usage, setUsage] = useState<number>(0);
  const [quota, setQuota] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadQuota = async () => {
    const q = await PayloadRepository.getStorageUsage();
    setUsage(q.usage);
    setQuota(q.quota);
  };

  useEffect(() => {
    loadQuota();
  }, []);

  const handleCleanOrphans = async () => {
    setLoading(true);
    setStatusMessage('Scanning and purging unreferenced payload files in OPFS...');
    try {
      const referencedHashes = new Set(project.files.map((f) => f.source_ref));
      const removedCount = await PayloadRepository.cleanOrphans(referencedHashes);
      await loadQuota();
      setStatusMessage(`Cleaned up ${removedCount} unreferenced files.`);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm('Are you sure you want to purge ALL payload files in OPFS storage? Any files not saved externally will be lost.')) {
      return;
    }

    setLoading(true);
    setStatusMessage('Purging all OPFS storage...');
    try {
      await PayloadRepository.purgeAll();
      await loadQuota();
      setStatusMessage('All OPFS payloads purged.');
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const percentUsed = quota > 0 ? ((usage / quota) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-semibold text-slate-100">
              Browser Storage (OPFS) Manager
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Origin Private File System (OPFS)</span>
              <span className="font-mono text-emerald-400">
                {formatBytes(usage)} / {formatBytes(quota)} ({percentUsed}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, parseFloat(percentUsed))}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              OPFS keeps all payload chunks directly in browser-managed local disk storage, preventing JavaScript memory heap crashes even when compiling large multi-megabyte cabinets.
            </p>
          </div>

          {statusMessage && (
            <div className="p-3 bg-slate-800/80 rounded-lg text-xs text-slate-200">
              {statusMessage}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCleanOrphans}
              disabled={loading}
              className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Clean Orphans</span>
            </button>

            <button
              onClick={handlePurgeAll}
              disabled={loading}
              className="flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge All</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
