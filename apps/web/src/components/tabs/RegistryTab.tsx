import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, Shield } from 'lucide-react';
import { MsiBuilderProject, RegistryValueConfig, RegistryHive, RegistryValueType } from '../../types/models';
import { AclPermissionSelector } from '../common/AclPermissionSelector';
import { getPresetById } from '../../utils/aclPresets';
import { WindowsRegistryIcon } from '../icons/CustomIcons';

interface RegistryTabProps {
  project: MsiBuilderProject;
  onChange: (updated: MsiBuilderProject) => void;
}

export const RegistryTab: React.FC<RegistryTabProps> = ({ project, onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RegistryValueConfig> | null>(null);

  const [newReg, setNewReg] = useState<Partial<RegistryValueConfig>>({
    hive: project.package.install_context === 'perUser' ? 'HKCU' : 'HKLM',
    key: `Software\\${project.package.manufacturer || 'Company'}\\${project.package.product_name || 'App'}`,
    name: 'Version',
    type: 'string',
    value: project.package.version || '1.0.0',
    owner_file_id: project.files[0]?.id || undefined,
    registry_view: 'inherit',
  });

  const startEditing = (reg: RegistryValueConfig) => {
    setEditingId(reg.id);
    setEditForm({
      ...reg,
      value: Array.isArray(reg.value) ? reg.value.join('\n') : reg.value,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (!editingId || !editForm) return;
    if (!editForm.key?.trim() || !editForm.hive) {
      alert('Hive and Key are required.');
      return;
    }

    let parsedValue = editForm.value;
    if (editForm.type === 'dword') {
      parsedValue = parseInt(String(editForm.value), 10) || 0;
    } else if (editForm.type === 'multiString') {
      if (typeof editForm.value === 'string') {
        parsedValue = editForm.value.split('\n').map((s) => s.trim()).filter(Boolean);
      }
    }

    const updatedRegistry = project.registry.map((r) =>
      r.id === editingId
        ? {
            ...r,
            hive: (editForm.hive as RegistryHive) || 'HKCU',
            key: editForm.key!.trim(),
            name: editForm.name?.trim() || undefined,
            type: (editForm.type as RegistryValueType) || 'string',
            value: parsedValue,
            registry_view: editForm.registry_view || 'inherit',
            owner_file_id: editForm.owner_file_id || undefined,
            permission_preset: editForm.permission_preset,
            permission_sddl: editForm.permission_sddl,
          }
        : r
    );

    onChange({
      ...project,
      registry: updatedRegistry,
      updated_at: new Date().toISOString(),
    });

    setEditingId(null);
    setEditForm(null);
  };

  const addRegistryValue = () => {
    if (!newReg.key || !newReg.hive) {
      alert('Hive and Key are required.');
      return;
    }

    let parsedValue = newReg.value;
    if (newReg.type === 'dword') {
      parsedValue = parseInt(String(newReg.value), 10) || 0;
    } else if (newReg.type === 'multiString') {
      if (typeof newReg.value === 'string') {
        parsedValue = newReg.value.split('\n').map((s) => s.trim()).filter(Boolean);
      }
    }

    const regValue: RegistryValueConfig = {
      id: `reg_${Date.now()}`,
      hive: (newReg.hive as RegistryHive) || 'HKCU',
      key: newReg.key,
      name: newReg.name || undefined,
      type: (newReg.type as RegistryValueType) || 'string',
      value: parsedValue,
      registry_view: newReg.registry_view || 'inherit',
      owner_file_id: newReg.owner_file_id || undefined,
      permission_preset: newReg.permission_preset,
      permission_sddl: newReg.permission_sddl,
    };

    onChange({
      ...project,
      registry: [...project.registry, regValue],
      updated_at: new Date().toISOString(),
    });

    setShowAddForm(false);
  };

  const removeRegistry = (id: string) => {
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
    onChange({
      ...project,
      registry: project.registry.filter((r) => r.id !== id),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Registry Keys & Values</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Write configuration, file associations, or environment values to Windows Registry.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-400 active:scale-95 text-slate-950 font-bold transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Registry Value</span>
        </button>
      </div>

      {project.package.install_context === 'perUser' && (
        <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>
            In <strong>Per-User</strong> installations, prefer <strong>HKCU</strong> (HKEY_CURRENT_USER). Writing to HKLM requires UAC elevation.
          </span>
        </div>
      )}

      {showAddForm && (
        <div className="bg-slate-900 border border-brand-500/40 rounded-xl p-5 space-y-4 shadow-lg shadow-brand-500/5">
          <h3 className="text-sm font-semibold text-slate-200">New Registry Value</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Root Hive <span className="text-rose-400">*</span>
              </label>
              <select
                value={newReg.hive}
                onChange={(e) => setNewReg({ ...newReg, hive: e.target.value as RegistryHive })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="HKCU">HKCU (HKEY_CURRENT_USER)</option>
                <option value="HKLM">HKLM (HKEY_LOCAL_MACHINE)</option>
                <option value="HKCR">HKCR (HKEY_CLASSES_ROOT)</option>
                <option value="HKU">HKU (HKEY_USERS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Value Type <span className="text-rose-400">*</span>
              </label>
              <select
                value={newReg.type}
                onChange={(e) => setNewReg({ ...newReg, type: e.target.value as RegistryValueType })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="string">String (REG_SZ)</option>
                <option value="expandString">Expandable String (REG_EXPAND_SZ)</option>
                <option value="dword">DWORD 32-bit (REG_DWORD)</option>
                <option value="binary">Binary (REG_BINARY hex)</option>
                <option value="multiString">Multi-String (REG_MULTI_SZ)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Key Path <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newReg.key || ''}
                onChange={(e) => setNewReg({ ...newReg, key: e.target.value })}
                placeholder="Software\AcmeCorp\AcmeApp"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Value Name
              </label>
              <input
                type="text"
                value={newReg.name || ''}
                onChange={(e) => setNewReg({ ...newReg, name: e.target.value })}
                placeholder="(Default)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Value Data <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={String(newReg.value ?? '')}
                onChange={(e) => setNewReg({ ...newReg, value: e.target.value })}
                placeholder="1.0.0"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Owner File (Optional)
              </label>
              <select
                value={newReg.owner_file_id || ''}
                onChange={(e) => setNewReg({ ...newReg, owner_file_id: e.target.value || undefined })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="">(Standalone Registry Component)</option>
                {project.files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.destination_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 pt-1">
              <AclPermissionSelector
                target="registry"
                preset={newReg.permission_preset}
                sddl={newReg.permission_sddl}
                label="Registry Key Security (ACL)"
                onChange={(preset, sddl) => setNewReg({ ...newReg, permission_preset: preset, permission_sddl: sddl })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={addRegistryValue}
              className="px-4 py-1.5 text-xs font-semibold bg-brand-500 text-slate-950 rounded-lg hover:bg-brand-400 transition"
            >
              Add Value
            </button>
          </div>
        </div>
      )}

      {/* Registry List */}
      {project.registry.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 border border-slate-800/80 rounded-xl">
          <WindowsRegistryIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-400">No registry values configured</p>
          <p className="text-xs text-slate-500 mt-1">
            Add registry keys above to persist application settings or register components.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {project.registry.map((reg) => {
            const isEditing = editingId === reg.id;

            if (isEditing && editForm) {
              return (
                <div
                  key={reg.id}
                  className="bg-slate-900 border border-brand-500/50 rounded-xl p-4 space-y-4 shadow-lg shadow-brand-500/10"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-brand-400">Editing Registry Value</span>
                    <button
                      onClick={cancelEditing}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Root Hive <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={editForm.hive}
                        onChange={(e) => setEditForm({ ...editForm, hive: e.target.value as RegistryHive })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      >
                        <option value="HKCU">HKCU (HKEY_CURRENT_USER)</option>
                        <option value="HKLM">HKLM (HKEY_LOCAL_MACHINE)</option>
                        <option value="HKCR">HKCR (HKEY_CLASSES_ROOT)</option>
                        <option value="HKU">HKU (HKEY_USERS)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Value Type <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as RegistryValueType })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      >
                        <option value="string">REG_SZ (String)</option>
                        <option value="expandString">REG_EXPAND_SZ (Expandable String)</option>
                        <option value="dword">REG_DWORD (Integer)</option>
                        <option value="binary">REG_BINARY (Hex Binary)</option>
                        <option value="multiString">REG_MULTI_SZ (Multi-String)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Registry Key Path <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.key || ''}
                        onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                        placeholder="Software\MyCompany\MyApp"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Value Name (leave blank for default)
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="(Default)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Value Data
                      </label>
                      {editForm.type === 'multiString' ? (
                        <textarea
                          rows={2}
                          value={String(editForm.value || '')}
                          onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                        />
                      ) : (
                        <input
                          type={editForm.type === 'dword' ? 'number' : 'text'}
                          value={String(editForm.value ?? '')}
                          onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Associated Component File
                      </label>
                      <select
                        value={editForm.owner_file_id || ''}
                        onChange={(e) => setEditForm({ ...editForm, owner_file_id: e.target.value || undefined })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                      >
                        <option value="">(Standalone Registry Component)</option>
                        {project.files.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.destination_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Registry Bitness View
                      </label>
                      <select
                        value={editForm.registry_view || 'inherit'}
                        onChange={(e) => setEditForm({ ...editForm, registry_view: e.target.value as any })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      >
                        <option value="inherit">Inherit Package Architecture</option>
                        <option value="reg64">64-bit Registry View</option>
                        <option value="reg32">32-bit Registry View</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 pt-1">
                      <AclPermissionSelector
                        target="registry"
                        preset={editForm.permission_preset}
                        sddl={editForm.permission_sddl}
                        label="Registry Key Security (ACL)"
                        onChange={(preset, sddl) => setEditForm({ ...editForm, permission_preset: preset, permission_sddl: sddl })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditing}
                      className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-500 text-slate-950 rounded-lg hover:bg-brand-400 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={reg.id}
                className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <WindowsRegistryIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono font-semibold">
                      {reg.hive}
                    </span>
                    <span className="text-sm font-mono text-slate-200">{reg.key}</span>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Name: <strong className="text-slate-300">{reg.name || '(Default)'}</strong></span>
                    <span>•</span>
                    <span>Type: <strong className="text-cyan-400 font-mono">{reg.type}</strong></span>
                    <span>•</span>
                    <span>Value: <code className="text-slate-300 font-mono">{JSON.stringify(reg.value)}</code></span>
                    {reg.permission_preset && reg.permission_preset !== 'none' && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 font-medium">
                          <Shield className="w-3 h-3" />
                          <span>{getPresetById(reg.permission_preset)?.badge || 'Custom ACL'}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startEditing(reg)}
                    className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded transition"
                    title="Edit registry value"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeRegistry(reg.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                    title="Remove registry value"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
