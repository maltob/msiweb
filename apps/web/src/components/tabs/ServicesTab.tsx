import React, { useState } from 'react';
import { Plus, Trash2, ShieldAlert, Pencil, Check, X, Shield } from 'lucide-react';
import { MsiBuilderProject, ServiceConfig, ServiceStartType, ServiceErrorControl } from '../../types/models';
import { AclPermissionSelector } from '../common/AclPermissionSelector';
import { getPresetById } from '../../utils/aclPresets';
import { WindowsServiceIcon } from '../icons/CustomIcons';

interface ServicesTabProps {
  project: MsiBuilderProject;
  onChange: (updated: MsiBuilderProject) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({ project, onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceConfig> | null>(null);

  const [newSvc, setNewSvc] = useState<Partial<ServiceConfig>>({
    name: 'AcmeDaemon',
    display_name: 'Acme Background Service',
    description: 'Background worker service for Acme App',
    executable_file_id: project.files[0]?.id || '',
    service_type: 'ownProcess',
    start_type: 'auto',
    error_control: 'normal',
    account: 'LocalSystem',
    dependencies: [],
    start_on_install: true,
    stop_on_uninstall: true,
    delete_on_uninstall: true,
    wait: true,
  });

  const isPerUser = project.package.install_context === 'perUser';

  const startEditing = (svc: ServiceConfig) => {
    setEditingId(svc.id);
    setEditForm({ ...svc });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (!editingId || !editForm) return;
    if (!editForm.name?.trim() || !editForm.executable_file_id) {
      alert('Service Name and Executable File are required.');
      return;
    }

    const updatedServices = project.services.map((s) =>
      s.id === editingId
        ? {
            ...s,
            name: editForm.name!.trim(),
            display_name: editForm.display_name?.trim() || undefined,
            description: editForm.description?.trim() || undefined,
            executable_file_id: editForm.executable_file_id!,
            service_type: 'ownProcess' as const,
            start_type: (editForm.start_type as ServiceStartType) || 'auto',
            error_control: (editForm.error_control as ServiceErrorControl) || 'normal',
            account: editForm.account || 'LocalSystem',
            arguments: editForm.arguments?.trim() || undefined,
            dependencies: editForm.dependencies || [],
            start_on_install: editForm.start_on_install ?? true,
            stop_on_uninstall: editForm.stop_on_uninstall ?? true,
            delete_on_uninstall: editForm.delete_on_uninstall ?? true,
            wait: editForm.wait ?? true,
            permission_preset: editForm.permission_preset,
            permission_sddl: editForm.permission_sddl,
          }
        : s
    );

    onChange({
      ...project,
      services: updatedServices,
      updated_at: new Date().toISOString(),
    });

    setEditingId(null);
    setEditForm(null);
  };

  const addService = () => {
    if (!newSvc.name || !newSvc.executable_file_id) {
      alert('Service Name and Executable File are required.');
      return;
    }

    const svc: ServiceConfig = {
      id: `svc_${Date.now()}`,
      name: newSvc.name,
      display_name: newSvc.display_name,
      description: newSvc.description,
      executable_file_id: newSvc.executable_file_id,
      service_type: 'ownProcess',
      start_type: (newSvc.start_type as ServiceStartType) || 'auto',
      error_control: (newSvc.error_control as ServiceErrorControl) || 'normal',
      account: newSvc.account || 'LocalSystem',
      arguments: newSvc.arguments,
      dependencies: newSvc.dependencies || [],
      start_on_install: newSvc.start_on_install ?? true,
      stop_on_uninstall: newSvc.stop_on_uninstall ?? true,
      delete_on_uninstall: newSvc.delete_on_uninstall ?? true,
      wait: newSvc.wait ?? true,
      permission_preset: newSvc.permission_preset,
      permission_sddl: newSvc.permission_sddl,
    };

    onChange({
      ...project,
      services: [...project.services, svc],
      updated_at: new Date().toISOString(),
    });

    setShowAddForm(false);
  };

  const removeService = (id: string) => {
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
    onChange({
      ...project,
      services: project.services.filter((s) => s.id !== id),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Windows NT Services</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure ServiceControl and ServiceInstall tables for background system daemons.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          disabled={project.files.length === 0 || isPerUser}
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            project.files.length === 0 || isPerUser
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-brand-500 hover:bg-brand-400 active:scale-95 text-slate-950 font-bold'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Service</span>
        </button>
      </div>

      {isPerUser && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <strong className="block text-sm font-semibold text-rose-200">
              Per-Machine Scope Required for Windows Services
            </strong>
            <span>
              Windows Installer cannot install Windows Services in a Per-User context. Go to the Package Info tab and switch Install Scope to <strong>Per-Machine</strong> before building this package.
            </span>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-slate-900 border border-brand-500/40 rounded-xl p-5 space-y-4 shadow-lg shadow-brand-500/5">
          <h3 className="text-sm font-semibold text-slate-200">New Windows Service</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Service Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newSvc.name || ''}
                onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                placeholder="e.g. MyDaemon"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={newSvc.display_name || ''}
                onChange={(e) => setNewSvc({ ...newSvc, display_name: e.target.value })}
                placeholder="My Daemon Service"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Executable Payload File <span className="text-rose-400">*</span>
              </label>
              <select
                value={newSvc.executable_file_id}
                onChange={(e) => setNewSvc({ ...newSvc, executable_file_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
              >
                {project.files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.destination_name} ({f.destination_directory || 'root'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Startup Type
              </label>
              <select
                value={newSvc.start_type}
                onChange={(e) =>
                  setNewSvc({ ...newSvc, start_type: e.target.value as ServiceStartType })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="auto">Automatic (Starts on Boot)</option>
                <option value="demand">Manual (On Demand)</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Account
              </label>
              <select
                value={newSvc.account}
                onChange={(e) => setNewSvc({ ...newSvc, account: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="LocalSystem">LocalSystem</option>
                <option value="LocalService">NT AUTHORITY\LocalService</option>
                <option value="NetworkService">NT AUTHORITY\NetworkService</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Error Control
              </label>
              <select
                value={newSvc.error_control}
                onChange={(e) =>
                  setNewSvc({ ...newSvc, error_control: e.target.value as ServiceErrorControl })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="normal">Normal (Log warning)</option>
                <option value="critical">Critical (Fail startup)</option>
                <option value="ignore">Ignore</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Executable Arguments
              </label>
              <input
                type="text"
                value={newSvc.arguments || ''}
                onChange={(e) => setNewSvc({ ...newSvc, arguments: e.target.value })}
                placeholder="--service"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            <div className="md:col-span-2 pt-1">
              <AclPermissionSelector
                target="service"
                preset={newSvc.permission_preset}
                sddl={newSvc.permission_sddl}
                label="Service Security Permissions (ACL)"
                onChange={(preset, sddl) => setNewSvc({ ...newSvc, permission_preset: preset, permission_sddl: sddl })}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newSvc.start_on_install}
                onChange={(e) => setNewSvc({ ...newSvc, start_on_install: e.target.checked })}
                className="rounded text-brand-500 bg-slate-950 border-slate-800"
              />
              <span>Start service immediately after installation completes</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newSvc.stop_on_uninstall}
                onChange={(e) => setNewSvc({ ...newSvc, stop_on_uninstall: e.target.checked })}
                className="rounded text-brand-500 bg-slate-950 border-slate-800"
              />
              <span>Stop service before package removal or upgrade</span>
            </label>

            <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newSvc.delete_on_uninstall}
                onChange={(e) => setNewSvc({ ...newSvc, delete_on_uninstall: e.target.checked })}
                className="rounded text-brand-500 bg-slate-950 border-slate-800"
              />
              <span>Delete service definition on uninstallation</span>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={addService}
              className="px-4 py-1.5 text-xs font-semibold bg-brand-500 text-slate-950 rounded-lg hover:bg-brand-400 transition"
            >
              Add Service
            </button>
          </div>
        </div>
      )}

      {/* Services List */}
      {project.services.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 border border-slate-800/80 rounded-xl">
          <WindowsServiceIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-400">No services configured</p>
          <p className="text-xs text-slate-500 mt-1">
            Add background Windows services managed by Windows Service Control Manager.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {project.services.map((svc) => {
            const isEditing = editingId === svc.id;

            if (isEditing && editForm) {
              return (
                <div
                  key={svc.id}
                  className="bg-slate-900 border border-brand-500/50 rounded-xl p-4 space-y-4 shadow-lg shadow-brand-500/10"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-brand-400">Editing Service</span>
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
                        Service Internal Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Executable Payload File <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={editForm.executable_file_id}
                        onChange={(e) => setEditForm({ ...editForm, executable_file_id: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                      >
                        {project.files.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.destination_name} ({f.destination_directory || 'root'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editForm.display_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Startup Type
                      </label>
                      <select
                        value={editForm.start_type}
                        onChange={(e) => setEditForm({ ...editForm, start_type: e.target.value as ServiceStartType })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      >
                        <option value="auto">Automatic (At system boot)</option>
                        <option value="demand">Manual (On demand)</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Account
                      </label>
                      <input
                        type="text"
                        value={editForm.account || 'LocalSystem'}
                        onChange={(e) => setEditForm({ ...editForm, account: e.target.value })}
                        placeholder="LocalSystem, NT AUTHORITY\LocalService"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Arguments
                      </label>
                      <input
                        type="text"
                        value={editForm.arguments || ''}
                        onChange={(e) => setEditForm({ ...editForm, arguments: e.target.value })}
                        placeholder="--service"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="md:col-span-2 pt-1">
                      <AclPermissionSelector
                        target="service"
                        preset={editForm.permission_preset}
                        sddl={editForm.permission_sddl}
                        label="Service Security Permissions (ACL)"
                        onChange={(preset, sddl) => setEditForm({ ...editForm, permission_preset: preset, permission_sddl: sddl })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.start_on_install ?? true}
                        onChange={(e) => setEditForm({ ...editForm, start_on_install: e.target.checked })}
                        className="rounded text-brand-500 bg-slate-950 border-slate-800"
                      />
                      <span>Start service immediately after installation completes</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.stop_on_uninstall ?? true}
                        onChange={(e) => setEditForm({ ...editForm, stop_on_uninstall: e.target.checked })}
                        className="rounded text-brand-500 bg-slate-950 border-slate-800"
                      />
                      <span>Stop service before package removal / upgrade</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.delete_on_uninstall ?? true}
                        onChange={(e) => setEditForm({ ...editForm, delete_on_uninstall: e.target.checked })}
                        className="rounded text-brand-500 bg-slate-950 border-slate-800"
                      />
                      <span>Delete service definition on uninstallation</span>
                    </label>
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
                key={svc.id}
                className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <WindowsServiceIcon className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-200">{svc.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-brand-400 font-mono">
                      {svc.start_type}
                    </span>
                    <span className="text-xs text-slate-500">{svc.account}</span>
                    {svc.permission_preset && svc.permission_preset !== 'none' && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-medium">
                        <Shield className="w-3 h-3" />
                        <span>{getPresetById(svc.permission_preset)?.badge || 'Custom ACL'}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    <span>Display: <strong>{svc.display_name || svc.name}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startEditing(svc)}
                    className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded transition"
                    title="Edit service"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeService(svc.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                    title="Remove service"
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
