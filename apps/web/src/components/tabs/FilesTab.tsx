import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Trash2, 
  Key, 
  RefreshCw, 
  FolderPlus, 
  Folder,
  Edit2,
  FileText,
  Shield,
  X
} from 'lucide-react';
import { MsiBuilderProject, PackageFile, FolderConfig } from '../../types/models';
import { PayloadRepository } from '../../storage/payloadRepository';
import { generateGuid, formatBytes } from '../../utils/guid';
import { AclPermissionSelector } from '../common/AclPermissionSelector';
import { getPresetById } from '../../utils/aclPresets';

interface FilesTabProps {
  project: MsiBuilderProject;
  onChange: (updated: MsiBuilderProject) => void;
}

export const FilesTab: React.FC<FilesTabProps> = ({ project, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [ingestionStatus, setIngestionStatus] = useState<string | null>(null);
  const [ingestionProgress, setIngestionProgress] = useState<number>(0);
  const [selectedFileForAcl, setSelectedFileForAcl] = useState<PackageFile | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [folderPathInput, setFolderPathInput] = useState('');
  const [folderPreset, setFolderPreset] = useState<string | undefined>(undefined);
  const [folderSddl, setFolderSddl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    setIngestionProgress(0);
    const newPackageFiles: PackageFile[] = [];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      setIngestionStatus(`Ingesting ${file.name} into OPFS storage...`);

      try {
        const ingested = await PayloadRepository.ingestFile(
          file,
          file.name,
          (processed, total) => {
            const overall = ((i + (total > 0 ? processed / total : 1)) / filesArray.length) * 100;
            setIngestionProgress(Math.min(99, Math.round(overall)));
          }
        );

        const fileId = `fil_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const compId = `cmp_${fileId}`;

        newPackageFiles.push({
          id: fileId,
          component_id: compId,
          component_guid: generateGuid(),
          source_ref: ingested.sha256,
          source_display_name: file.name,
          relative_source_path: file.webkitRelativePath || undefined,
          destination_directory: '',
          destination_name: file.name,
          size: file.size,
          last_modified: file.lastModified,
          architecture_id: undefined,
          key_path: true,
        });
      } catch (err: any) {
        console.error(`Failed to ingest ${file.name}:`, err);
        alert(`Failed to ingest ${file.name}: ${err.message}`);
      }
    }

    setIngestionProgress(100);
    setIngestionStatus(null);

    onChange({
      ...project,
      files: [...project.files, ...newPackageFiles],
      updated_at: new Date().toISOString(),
    });
  };

  const removeFile = async (fileId: string) => {
    const fileToRemove = project.files.find((f) => f.id === fileId);
    const updatedFiles = project.files.filter((f) => f.id !== fileId);

    // Also remove any shortcuts or services targeting this file
    const updatedShortcuts = project.shortcuts.filter((s) => s.target_file_id !== fileId);
    const updatedServices = project.services.filter((s) => s.executable_file_id !== fileId);

    onChange({
      ...project,
      files: updatedFiles,
      shortcuts: updatedShortcuts,
      services: updatedServices,
      updated_at: new Date().toISOString(),
    });

    // Clean up OPFS payload if no longer referenced
    if (fileToRemove) {
      const remainingRefs = new Set(updatedFiles.map((f) => f.source_ref));
      if (!remainingRefs.has(fileToRemove.source_ref)) {
        await PayloadRepository.removeFile(fileToRemove.source_ref);
      }
    }
  };

  const updateFile = (fileId: string, patch: Partial<PackageFile>) => {
    const updatedFiles = project.files.map((f) =>
      f.id === fileId ? { ...f, ...patch } : f
    );
    onChange({
      ...project,
      files: updatedFiles,
      updated_at: new Date().toISOString(),
    });
  };

  const openAddFolder = () => {
    setEditingFolderId(null);
    setFolderPathInput('');
    setFolderPreset(undefined);
    setFolderSddl(undefined);
    setIsFolderModalOpen(true);
  };

  const openEditFolder = (fld: FolderConfig) => {
    setEditingFolderId(fld.id);
    setFolderPathInput(fld.path);
    setFolderPreset(fld.permission_preset);
    setFolderSddl(fld.permission_sddl);
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = () => {
    const cleanPath = folderPathInput.trim().replace(/^\/+|\/+$/g, '').replace(/\\+/g, '/');
    if (!cleanPath) return;

    const currentFolders = project.folders || [];
    let updatedFolders: FolderConfig[];

    if (editingFolderId) {
      updatedFolders = currentFolders.map((f) =>
        f.id === editingFolderId
          ? {
              ...f,
              path: cleanPath,
              permission_preset: folderPreset,
              permission_sddl: folderSddl,
            }
          : f
      );
    } else {
      const newId = `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newFolder: FolderConfig = {
        id: newId,
        path: cleanPath,
        component_id: `cmp_${newId}`,
        component_guid: generateGuid(),
        permission_preset: folderPreset,
        permission_sddl: folderSddl,
      };
      updatedFolders = [...currentFolders, newFolder];
    }

    onChange({
      ...project,
      folders: updatedFolders,
      updated_at: new Date().toISOString(),
    });

    setIsFolderModalOpen(false);
    setEditingFolderId(null);
    setFolderPathInput('');
    setFolderPreset(undefined);
    setFolderSddl(undefined);
  };

  const removeFolder = (folderId: string) => {
    const updatedFolders = (project.folders || []).filter((f) => f.id !== folderId);
    onChange({
      ...project,
      folders: updatedFolders,
      updated_at: new Date().toISOString(),
    });
  };

  const totalPayloadSize = project.files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      {/* Drag & Drop Ingestion Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
            }
          }}
        />

        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
          <Upload className="w-6 h-6 text-brand-400" />
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-200">
            Click to browse or drag and drop payload files here
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Files stream directly into your browser's private OPFS storage using chunked hashing.
          </p>
        </div>

        {ingestionStatus && (
          <div className="w-full max-w-md mt-2 space-y-2">
            <div className="flex justify-between text-xs text-slate-300">
              <span>{ingestionStatus}</span>
              <span>{ingestionProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 transition-all duration-200"
                style={{ width: `${ingestionProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Files Header & Metrics */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl px-5 py-3">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-semibold text-slate-200">
            Payload Manifest ({project.files.length} {project.files.length === 1 ? 'file' : 'files'})
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {formatBytes(totalPayloadSize)} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAddFolder}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add Folder</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 rounded-lg transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add More Files</span>
          </button>
        </div>
      </div>

      {/* Payload Table */}
      {project.files.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/30 border border-slate-800/80 rounded-xl">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">No payload files added yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Drag application binaries, libraries, configurations, or assets above to embed them into your MSI.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Destination Name</th>
                  <th className="px-4 py-3">Subdirectory</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Permissions</th>
                  <th className="px-4 py-3">KeyPath</th>
                  <th className="px-4 py-3">Component GUID</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {project.files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-850/50 transition">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={file.destination_name}
                          onChange={(e) => updateFile(file.id, { destination_name: e.target.value })}
                          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono w-52 focus:outline-none focus:border-brand-500"
                          title="Installed file name"
                        />
                        {file.source_display_name !== file.destination_name && (
                          <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]" title={`Source: ${file.source_display_name}`}>
                            Orig: {file.source_display_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={file.destination_directory}
                        onChange={(e) => updateFile(file.id, { destination_directory: e.target.value })}
                        placeholder="(root: INSTALLDIR)"
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-100 font-mono w-40 focus:outline-none focus:border-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedFileForAcl(file)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition border ${
                          file.permission_preset && file.permission_preset !== 'none'
                            ? 'bg-brand-500/10 text-brand-400 border-brand-500/30 hover:bg-brand-500/20'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                        title="Configure file ACL permissions"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>{getPresetById(file.permission_preset)?.badge || 'Inherited'}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => updateFile(file.id, { key_path: !file.key_path })}
                        className={`p-1 rounded transition ${
                          file.key_path
                            ? 'text-brand-400 bg-brand-500/10'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={file.key_path ? 'Component KeyPath: Yes' : 'Component KeyPath: No'}
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={file.component_guid}
                          onChange={(e) => updateFile(file.id, { component_guid: e.target.value })}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-300 w-52 focus:outline-none focus:border-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => updateFile(file.id, { component_guid: generateGuid() })}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="Generate new component GUID"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explicit & Empty Folders Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <Folder className="w-4 h-4 text-emerald-400" />
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                Explicit Folders & Empty Directories ({(project.folders || []).length})
              </h4>
              <p className="text-xs text-slate-400">
                Folders configured here are guaranteed to be created by Windows Installer (even if empty) and cleanly uninstalled.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddFolder}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        {(project.folders || []).length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No explicit folders defined. Folders are automatically deduced from file paths, or click <strong className="text-emerald-400">New Folder</strong> to author empty directories like <code className="text-slate-400 bg-slate-950 px-1 py-0.5 rounded">logs</code>, <code className="text-slate-400 bg-slate-950 px-1 py-0.5 rounded">cache</code>, or custom security ACLs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Folder Path</th>
                  <th className="px-4 py-3">Files Inside</th>
                  <th className="px-4 py-3">Security Permissions (ACL)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-normal">
                {(project.folders || []).map((folder) => {
                  const clean = folder.path.trim().replace(/^\/+|\/+$/g, '').replace(/\\+/g, '/').toLowerCase();
                  const matchingFilesCount = project.files.filter((f) => {
                    const fileDir = f.destination_directory.trim().replace(/^\/+|\/+$/g, '').replace(/\\+/g, '/').toLowerCase();
                    return fileDir === clean || fileDir.startsWith(clean + '/');
                  }).length;
                  const preset = getPresetById(folder.permission_preset);

                  return (
                    <tr key={folder.id} className="hover:bg-slate-850/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div>
                            <span className="font-mono text-xs text-slate-100 font-semibold">{folder.path}</span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              INSTALLDIR\{folder.path.replace(/\//g, '\\')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {matchingFilesCount === 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                            Empty directory
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {matchingFilesCount} {matchingFilesCount === 1 ? 'file' : 'files'} inside
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {preset ? (
                          <button
                            type="button"
                            onClick={() => openEditFolder(folder)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
                            title={preset.description}
                          >
                            <Shield className="w-3 h-3 text-emerald-400" />
                            <span>{preset.name}</span>
                          </button>
                        ) : folder.permission_sddl ? (
                          <button
                            type="button"
                            onClick={() => openEditFolder(folder)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition"
                            title={folder.permission_sddl}
                          >
                            <Shield className="w-3 h-3 text-cyan-400" />
                            <span>Custom SDDL</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditFolder(folder)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                          >
                            <span>Default (Inherited)</span>
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => openEditFolder(folder)}
                            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
                            title="Edit folder / permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFolder(folder.id)}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                            title="Delete folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-emerald-400" />
                  <span>{editingFolderId ? 'Edit Explicit Folder' : 'Add Explicit Folder (Empty or Populated)'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Windows Installer will explicitly create this folder via CreateFolder and remove it on uninstall via RemoveFolders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFolderModalOpen(false);
                  setEditingFolderId(null);
                }}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subdirectory Path <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={folderPathInput}
                  onChange={(e) => setFolderPathInput(e.target.value)}
                  placeholder="e.g. logs, cache, plugins, data/temp"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500"
                />
                <p className="text-[11px] text-slate-500 mt-1.5 font-mono">
                  Full install path: <span className="text-slate-300">INSTALLDIR\{folderPathInput.trim().replace(/^\/+|\/+$/g, '').replace(/\//g, '\\') || '...'}</span>
                </p>
              </div>

              <AclPermissionSelector
                target="folder"
                preset={folderPreset}
                sddl={folderSddl}
                label="Folder Security Permissions (ACL)"
                onChange={(preset, sddl) => {
                  setFolderPreset(preset);
                  setFolderSddl(sddl);
                }}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsFolderModalOpen(false);
                  setEditingFolderId(null);
                }}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFolder}
                disabled={!folderPathInput.trim()}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                {editingFolderId ? 'Save Changes' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File ACL Permissions Modal */}
      {selectedFileForAcl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-400" />
                  <span>File Permissions</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {selectedFileForAcl.destination_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFileForAcl(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AclPermissionSelector
              target="file"
              preset={selectedFileForAcl.permission_preset}
              sddl={selectedFileForAcl.permission_sddl}
              label={`Security Permissions for ${selectedFileForAcl.destination_name}`}
              onChange={(preset, sddl) => {
                updateFile(selectedFileForAcl.id, {
                  permission_preset: preset,
                  permission_sddl: sddl,
                });
                setSelectedFileForAcl((prev) =>
                  prev ? { ...prev, permission_preset: preset, permission_sddl: sddl } : null
                );
              }}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedFileForAcl(null)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
