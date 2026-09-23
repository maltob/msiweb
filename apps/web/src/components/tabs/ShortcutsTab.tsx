import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { MsiBuilderProject, ShortcutConfig, ShortcutLocation } from '../../types/models';
import { WindowsShortcutIcon } from '../icons/CustomIcons';

interface ShortcutsTabProps {
  project: MsiBuilderProject;
  onChange: (updated: MsiBuilderProject) => void;
}

export const ShortcutsTab: React.FC<ShortcutsTabProps> = ({ project, onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ShortcutConfig> | null>(null);

  const [newShortcut, setNewShortcut] = useState<Partial<ShortcutConfig>>({
    name: project.package.product_name,
    location: 'startMenu',
    start_menu_subdirectory: project.package.manufacturer,
    target_file_id: project.files[0]?.id || '',
    show: 'normal',
    advertised: false,
  });

  const startEditing = (sct: ShortcutConfig) => {
    setEditingId(sct.id);
    setEditForm({ ...sct });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (!editingId || !editForm) return;
    if (!editForm.name?.trim() || !editForm.target_file_id) {
      alert('Shortcut Name and Target File are required.');
      return;
    }

    const updatedShortcuts = project.shortcuts.map((s) =>
      s.id === editingId
        ? {
            ...s,
            name: editForm.name!.trim(),
            location: (editForm.location as ShortcutLocation) || 'startMenu',
            start_menu_subdirectory: editForm.start_menu_subdirectory?.trim() || undefined,
            target_file_id: editForm.target_file_id!,
            arguments: editForm.arguments?.trim() || undefined,
            description: editForm.description?.trim() || undefined,
            show: editForm.show || 'normal',
          }
        : s
    );

    onChange({
      ...project,
      shortcuts: updatedShortcuts,
      updated_at: new Date().toISOString(),
    });

    setEditingId(null);
    setEditForm(null);
  };

  const addShortcut = () => {
    if (!newShortcut.name || !newShortcut.target_file_id) {
      alert('Shortcut Name and Target File are required.');
      return;
    }

    const shortcut: ShortcutConfig = {
      id: `sct_${Date.now()}`,
      name: newShortcut.name,
      location: (newShortcut.location as ShortcutLocation) || 'startMenu',
      start_menu_subdirectory: newShortcut.start_menu_subdirectory,
      target_file_id: newShortcut.target_file_id,
      arguments: newShortcut.arguments,
      description: newShortcut.description,
      show: newShortcut.show || 'normal',
      advertised: false,
    };

    onChange({
      ...project,
      shortcuts: [...project.shortcuts, shortcut],
      updated_at: new Date().toISOString(),
    });

    setShowAddForm(false);
    setNewShortcut({
      name: project.package.product_name,
      location: 'startMenu',
      start_menu_subdirectory: project.package.manufacturer,
      target_file_id: project.files[0]?.id || '',
      show: 'normal',
      advertised: false,
    });
  };

  const removeShortcut = (id: string) => {
    if (editingId === id) {
      setEditingId(null);
      setEditForm(null);
    }
    onChange({
      ...project,
      shortcuts: project.shortcuts.filter((s) => s.id !== id),
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Application Shortcuts</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create Start Menu or Desktop shortcuts pointing to installed executable payload files.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          disabled={project.files.length === 0}
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            project.files.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-brand-500 hover:bg-brand-400 active:scale-95 text-slate-950 font-bold'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Shortcut</span>
        </button>
      </div>

      {project.files.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>You need to add at least one payload file in the Files tab before creating a shortcut.</span>
        </div>
      )}

      {/* Add Shortcut Form Modal / Collapsible */}
      {showAddForm && (
        <div className="bg-slate-900 border border-brand-500/40 rounded-xl p-5 space-y-4 shadow-lg shadow-brand-500/5">
          <h3 className="text-sm font-semibold text-slate-200">New Shortcut</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Shortcut Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newShortcut.name || ''}
                onChange={(e) => setNewShortcut({ ...newShortcut, name: e.target.value })}
                placeholder="e.g. Acme App"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target File <span className="text-rose-400">*</span>
              </label>
              <select
                value={newShortcut.target_file_id}
                onChange={(e) => setNewShortcut({ ...newShortcut, target_file_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition font-mono"
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
                Shortcut Location
              </label>
              <select
                value={newShortcut.location}
                onChange={(e) =>
                  setNewShortcut({ ...newShortcut, location: e.target.value as ShortcutLocation })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="startMenu">Start Menu Programs</option>
                <option value="desktop">Desktop</option>
              </select>
            </div>

            {newShortcut.location === 'startMenu' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Start Menu Subfolder
                </label>
                <input
                  type="text"
                  value={newShortcut.start_menu_subdirectory || ''}
                  onChange={(e) =>
                    setNewShortcut({ ...newShortcut, start_menu_subdirectory: e.target.value })
                  }
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Window State
              </label>
              <select
                value={newShortcut.show}
                onChange={(e) =>
                  setNewShortcut({
                    ...newShortcut,
                    show: e.target.value as 'normal' | 'minimized' | 'maximized',
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
              >
                <option value="normal">Normal Window</option>
                <option value="maximized">Maximized</option>
                <option value="minimized">Minimized</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Command-line Arguments
              </label>
              <input
                type="text"
                value={newShortcut.arguments || ''}
                onChange={(e) => setNewShortcut({ ...newShortcut, arguments: e.target.value })}
                placeholder="--flag value"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
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
              onClick={addShortcut}
              className="px-4 py-1.5 text-xs font-semibold bg-brand-500 text-slate-950 rounded-lg hover:bg-brand-400 transition"
            >
              Create Shortcut
            </button>
          </div>
        </div>
      )}

      {/* Shortcuts List */}
      {project.shortcuts.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/30 border border-slate-800/80 rounded-xl">
          <WindowsShortcutIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-400">No shortcuts configured</p>
          <p className="text-xs text-slate-500 mt-1">
            Add a shortcut above to place an icon in the Start Menu or on the user's Desktop.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {project.shortcuts.map((sct) => {
            const isEditing = editingId === sct.id;
            const targetFile = project.files.find((f) => f.id === sct.target_file_id);

            if (isEditing && editForm) {
              return (
                <div
                  key={sct.id}
                  className="bg-slate-900 border border-brand-500/50 rounded-xl p-4 space-y-4 shadow-lg shadow-brand-500/10"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-brand-400">Editing Shortcut</span>
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
                        Shortcut Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Target File <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={editForm.target_file_id}
                        onChange={(e) => setEditForm({ ...editForm, target_file_id: e.target.value })}
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
                        Location
                      </label>
                      <select
                        value={editForm.location}
                        onChange={(e) =>
                          setEditForm({ ...editForm, location: e.target.value as ShortcutLocation })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      >
                        <option value="startMenu">Start Menu Programs</option>
                        <option value="desktop">Desktop</option>
                      </select>
                    </div>

                    {editForm.location === 'startMenu' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Start Menu Subfolder
                        </label>
                        <input
                          type="text"
                          value={editForm.start_menu_subdirectory || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, start_menu_subdirectory: e.target.value })
                          }
                          placeholder="e.g. Acme Corp"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Window State
                      </label>
                      <select
                        value={editForm.show}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            show: e.target.value as 'normal' | 'minimized' | 'maximized',
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand-500"
                      >
                        <option value="normal">Normal Window</option>
                        <option value="maximized">Maximized</option>
                        <option value="minimized">Minimized</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Arguments
                      </label>
                      <input
                        type="text"
                        value={editForm.arguments || ''}
                        onChange={(e) => setEditForm({ ...editForm, arguments: e.target.value })}
                        placeholder="--flag value"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-brand-500"
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
                key={sct.id}
                className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <WindowsShortcutIcon className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-200">{sct.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                      {sct.location === 'desktop' ? 'Desktop' : 'Start Menu'}
                    </span>
                    {sct.start_menu_subdirectory && (
                      <span className="text-xs text-slate-500">
                        ({sct.start_menu_subdirectory})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center space-x-2">
                    <span>Target:</span>
                    <span className="font-mono text-slate-300">
                      {targetFile ? targetFile.destination_name : sct.target_file_id}
                    </span>
                    {sct.arguments && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-500">{sct.arguments}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startEditing(sct)}
                    className="p-1.5 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded transition"
                    title="Edit shortcut"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeShortcut(sct.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                    title="Remove shortcut"
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
