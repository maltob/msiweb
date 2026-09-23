import React from 'react';
import { X, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ValidationReport } from '../../types/models';

interface ValidationModalProps {
  report: ValidationReport;
  onClose: () => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({ report, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            {report.is_valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            )}
            <h3 className="text-base font-semibold text-slate-100">
              {report.is_valid ? 'Package Configuration Valid' : 'Validation Issues Detected'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {report.is_valid && report.warnings.length === 0 && (
            <div className="text-center py-6 text-slate-300 space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-sm font-medium">All validation checks passed!</p>
              <p className="text-xs text-slate-500">
                Your package metadata, payload references, and directory structure are ready for compilation.
              </p>
            </div>
          )}

          {report.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Errors (Must fix before building)</span>
              </h4>
              <div className="space-y-2">
                {report.errors.map((err, i) => (
                  <div
                    key={i}
                    className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs space-y-1"
                  >
                    <div className="font-mono text-rose-300 font-semibold">{err.path}</div>
                    <div className="text-slate-300">{err.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.warnings.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Warnings</span>
              </h4>
              <div className="space-y-2">
                {report.warnings.map((warn, i) => (
                  <div
                    key={i}
                    className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1"
                  >
                    <div className="font-mono text-amber-300 font-semibold">{warn.path}</div>
                    <div className="text-slate-300">{warn.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
