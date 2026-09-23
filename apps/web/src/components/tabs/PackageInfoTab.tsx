import React from 'react';
import { RefreshCw } from 'lucide-react';
import { MsiBuilderProject, PackageConfig } from '../../types/models';
import { generateGuid } from '../../utils/guid';
import { ARCHITECTURE_PROFILES } from '../../types/architectures';
import { AclPermissionSelector } from '../common/AclPermissionSelector';

interface PackageInfoTabProps {
  project: MsiBuilderProject;
  onChange: (updated: MsiBuilderProject) => void;
}

export const PackageInfoTab: React.FC<PackageInfoTabProps> = ({ project, onChange }) => {
  const pkg = project.package;

  const updatePackage = (patch: Partial<PackageConfig>) => {
    const updatedPkg = { ...pkg, ...patch };

    // Auto-update output file name if default
    if (!patch.output_file_name) {
      const sanitizedName = (patch.product_name || pkg.product_name).replace(/[^a-zA-Z0-9_-]/g, '');
      const arch = patch.architecture_id || pkg.architecture_id;
      const ver = patch.version || pkg.version;
      updatedPkg.output_file_name = `${sanitizedName || 'Package'}-${ver}-${arch === 'amd64' ? 'x64' : 'x86'}.msi`;
    }

    onChange({
      ...project,
      package: updatedPkg,
      updated_at: new Date().toISOString(),
    });
  };

  const handleScopeChange = (scope: 'perUser' | 'perMachine') => {
    if (scope === 'perUser' && project.services.length > 0) {
      alert('Cannot switch to Per-User installation while Windows Services are configured. Windows Services require machine-level administrator privileges. Please remove services in the Services tab first.');
      return;
    }

    const defaultRoot =
      scope === 'perUser'
        ? 'LocalAppDataFolder'
        : pkg.architecture_id === 'amd64'
        ? 'ProgramFiles64Folder'
        : 'ProgramFilesFolder';
    updatePackage({
      install_context: scope,
      install_root: defaultRoot,
    });
  };

  const handleArchChange = (arch: 'amd64' | 'x86') => {
    const defaultRoot =
      pkg.install_context === 'perUser'
        ? 'LocalAppDataFolder'
        : arch === 'amd64'
        ? 'ProgramFiles64Folder'
        : 'ProgramFilesFolder';
    updatePackage({
      architecture_id: arch,
      install_root: defaultRoot,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* General Identity */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <span>General Identity</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={pkg.product_name}
              onChange={(e) => updatePackage({ product_name: e.target.value })}
              placeholder="e.g. Acme Studio"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Manufacturer / Vendor <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={pkg.manufacturer}
              onChange={(e) => updatePackage({ manufacturer: e.target.value })}
              placeholder="e.g. Acme Corporation"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Version <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={pkg.version}
              onChange={(e) => updatePackage({ version: e.target.value })}
              placeholder="1.0.0"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 font-mono transition"
            />
            <p className="text-xs text-slate-500 mt-1">Format: major.minor.build (e.g. 1.0.0)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Description
            </label>
            <input
              type="text"
              value={pkg.description || ''}
              onChange={(e) => updatePackage({ description: e.target.value })}
              placeholder="Package description"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
            />
          </div>
        </div>
      </section>

      {/* Target Platform & Architecture */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-100">Target Platform & Architecture</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Architecture
            </label>
            <select
              value={pkg.architecture_id}
              onChange={(e) => handleArchChange(e.target.value as 'amd64' | 'x86')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
            >
              {Object.values(ARCHITECTURE_PROFILES).map((arch) => (
                <option key={arch.id} value={arch.id}>
                  {arch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Installation Scope
            </label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="install_context"
                  value="perUser"
                  checked={pkg.install_context === 'perUser'}
                  onChange={() => handleScopeChange('perUser')}
                  className="text-brand-500 focus:ring-brand-500"
                />
                <span>Per-User (LocalAppData, no UAC prompt)</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="install_context"
                  value="perMachine"
                  checked={pkg.install_context === 'perMachine'}
                  onChange={() => handleScopeChange('perMachine')}
                  className="text-brand-500 focus:ring-brand-500"
                />
                <span>Per-Machine (Program Files, requires elevation)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Installation Root Folder
            </label>
            <input
              type="text"
              value={pkg.install_root}
              onChange={(e) => updatePackage({ install_root: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
            />
            <p className="text-xs text-slate-500 mt-1">Standard: LocalAppDataFolder, ProgramFiles64Folder, ProgramFilesFolder</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Installation Subdirectory <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={pkg.install_subdirectory}
              onChange={(e) => updatePackage({ install_subdirectory: e.target.value })}
              placeholder="e.g. AcmeApp"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <AclPermissionSelector
              target="folder"
              preset={pkg.permission_preset}
              sddl={pkg.permission_sddl}
              label="Root Installation Directory Permissions (ACL)"
              onChange={(preset, sddl) => updatePackage({ permission_preset: preset, permission_sddl: sddl })}
            />
          </div>
        </div>
      </section>

      {/* Package Codes & Major Upgrade Strategy */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Package Codes & Upgrade Management</h2>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            Major Upgrade Enabled
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <span>ProductCode (GUID)</span>
                <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => updatePackage({ product_code: generateGuid() })}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generate New</span>
              </button>
            </div>
            <input
              type="text"
              value={pkg.product_code}
              onChange={(e) => updatePackage({ product_code: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              Uniquely identifies this version release. Must change for every new major upgrade release.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <span>UpgradeCode (GUID)</span>
                <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Regenerating the UpgradeCode creates a separate product family and will break major upgrades from existing installed versions of your application. Are you sure you want to generate a new UpgradeCode?')) {
                    updatePackage({ upgrade_code: generateGuid() });
                  }
                }}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Generate New</span>
              </button>
            </div>
            <input
              type="text"
              value={pkg.upgrade_code}
              onChange={(e) => updatePackage({ upgrade_code: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
            />
            <p className="text-xs text-slate-500 mt-1">
              Must remain identical across all related product versions to link major upgrades and prevent downgrades.
            </p>
          </div>
        </div>
      </section>

      {/* Windows Installer / ARP Settings */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-100">Add/Remove Programs (ARP) & Controls</h2>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={pkg.arp_entry}
              onChange={(e) => updatePackage({ arp_entry: e.target.checked })}
              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-slate-950 border-slate-800"
            />
            <span>Register package in Windows Add/Remove Programs (Installed Apps)</span>
          </label>

          <label className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={pkg.allow_uninstall}
              onChange={(e) => updatePackage({ allow_uninstall: e.target.checked })}
              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-slate-950 border-slate-800"
            />
            <span>Allow Uninstall from Settings & Control Panel</span>
          </label>

          <label className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={pkg.allow_repair}
              onChange={(e) => updatePackage({ allow_repair: e.target.checked })}
              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-slate-950 border-slate-800"
            />
            <span>Allow Repair mode</span>
          </label>
        </div>

        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Output File Name
          </label>
          <input
            type="text"
            value={pkg.output_file_name || ''}
            onChange={(e) => updatePackage({ output_file_name: e.target.value })}
            placeholder="Package.msi"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-brand-500 transition"
          />
        </div>
      </section>
    </div>
  );
};
