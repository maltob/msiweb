import React from 'react';
import { Shield, Info, RotateCcw } from 'lucide-react';
import { getAclPresetsForTarget, getPresetById } from '../../utils/aclPresets';

interface AclPermissionSelectorProps {
  target: 'folder' | 'file' | 'registry' | 'service';
  preset?: string;
  sddl?: string;
  onChange: (preset?: string, sddl?: string) => void;
  label?: string;
  compact?: boolean;
}

export const AclPermissionSelector: React.FC<AclPermissionSelectorProps> = ({
  target,
  preset = 'none',
  sddl,
  onChange,
  label,
  compact = false,
}) => {
  const presets = getAclPresetsForTarget(target);
  const currentPreset = getPresetById(preset) || presets[0];
  const isCustom = preset === 'custom';
  const effectiveSddl = isCustom ? (sddl || '') : (currentPreset?.sddl || '');

  const handlePresetChange = (newPresetId: string) => {
    if (newPresetId === 'none') {
      onChange(undefined, undefined);
    } else if (newPresetId === 'custom') {
      onChange('custom', sddl || currentPreset.sddl || '');
    } else {
      const selected = getPresetById(newPresetId);
      onChange(newPresetId, selected?.sddl);
    }
  };

  const handleSddlChange = (val: string) => {
    onChange('custom', val);
  };

  const handleReset = () => {
    onChange(undefined, undefined);
  };

  const getBadgeColor = (pId: string) => {
    switch (pId) {
      case 'shared_all':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'admin_only':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'readonly_users':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'service_user_control':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'custom':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const defaultTitle = target === 'folder'
    ? 'Folder Permissions (ACL)'
    : target === 'file'
    ? 'File Permissions (ACL)'
    : target === 'registry'
    ? 'Registry Key Permissions (ACL)'
    : 'Service Permissions (ACL)';

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold text-slate-200">
            {label || defaultTitle}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getBadgeColor(preset)}`}>
            {currentPreset.badge}
          </span>
        </div>

        {preset !== 'none' && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset to default / inherited permissions"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Inherited</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">
            Access Control Preset
          </label>
          <select
            value={preset || 'none'}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full text-xs rounded-lg border border-slate-800 bg-slate-950 text-slate-100 px-3 py-2 focus:outline-none focus:border-brand-500 transition"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick action preset chips */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {presets.filter((p) => p.id !== 'none' && p.id !== 'custom').map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetChange(p.id)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
                preset === p.id
                  ? 'bg-brand-600 text-white font-medium shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {p.badge}
            </button>
          ))}
        </div>

        {/* Description & breakdown card */}
        {preset !== 'none' && (
          <div className="space-y-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {currentPreset.description}
            </p>

            {isCustom ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Custom SDDL String
                </label>
                <input
                  type="text"
                  value={effectiveSddl}
                  onChange={(e) => handleSddlChange(e.target.value)}
                  placeholder="e.g. D:(A;OICI;GA;;;WD)(A;OICI;GA;;;BA)(A;OICI;GA;;;SY)"
                  className="w-full text-xs font-mono rounded-lg border border-slate-800 bg-slate-900 text-slate-100 px-3 py-2 focus:outline-none focus:border-brand-500 transition"
                />
                <span className="block mt-1 text-[10px] text-slate-500">
                  Formatted as standard Windows Security Descriptor Definition Language (SDDL) text.
                </span>
              </div>
            ) : effectiveSddl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Generated SDDL (MsiLockPermissionsEx)
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 text-[11px] font-mono text-brand-300 select-all break-all border border-slate-800">
                  {effectiveSddl}
                </div>

                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-300">Principals (SIDs):</span>
                    <ul className="list-disc pl-3 mt-0.5 space-y-0.5">
                      {currentPreset.explanation.trustees.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-300">Permissions:</span>
                    <ul className="list-disc pl-3 mt-0.5 space-y-0.5">
                      {currentPreset.explanation.permissions.map((pm, idx) => (
                        <li key={idx}>{pm}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {preset === 'none' && !compact && (
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Standard Windows inheritance applies. No rows will be written to MsiLockPermissionsEx table.</span>
          </p>
        )}
      </div>
    </div>
  );
};
