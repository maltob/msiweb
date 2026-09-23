import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MsiBuilderProject, BuildResult, BuildProgress } from './types/models';
import { createDefaultProject } from './utils/defaultProject';
import { validateProject } from './validation/schema';
import { Header } from './components/Header';
import { Tabs, TabId } from './components/Tabs';
import { PackageInfoTab } from './components/tabs/PackageInfoTab';
import { FilesTab } from './components/tabs/FilesTab';
import { ShortcutsTab } from './components/tabs/ShortcutsTab';
import { RegistryTab } from './components/tabs/RegistryTab';
import { ServicesTab } from './components/tabs/ServicesTab';
import { ValidationModal } from './components/modals/ValidationModal';
import { BuildProgressModal } from './components/modals/BuildProgressModal';
import { PostBuildModal } from './components/modals/PostBuildModal';
import { StorageModal } from './components/modals/StorageModal';
import { ProjectArchive } from './storage/projectArchive';
import { WorkerBridge } from './worker/workerBridge';

const STORAGE_KEY = 'msi_builder_project_state_v1';

export const App: React.FC = () => {
  const [project, setProject] = useState<MsiBuilderProject>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return createDefaultProject();
  });

  const [activeTab, setActiveTab] = useState<TabId>('package');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState<BuildProgress | null>(null);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [msiBlob, setMsiBlob] = useState<Blob | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);
  const workerBridgeRef = useRef<WorkerBridge | null>(null);

  // Auto-save project changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
      console.warn('Failed saving project to localStorage:', e);
    }
  }, [project]);

  // Reactive validation report
  const validationReport = useMemo(() => validateProject(project), [project]);

  // Tab counts
  const counts = useMemo(
    () => ({
      files: project.files.length,
      shortcuts: project.shortcuts.length,
      registry: project.registry.length,
      services: project.services.length,
    }),
    [project]
  );

  // Build MSI action
  const handleBuild = async () => {
    if (!validationReport.is_valid) {
      setShowValidationModal(true);
      return;
    }

    setIsBuilding(true);
    setBuildProgress({
      step: 'validating',
      current: 5,
      total: 100,
      message: 'Starting build in dedicated Web Worker...',
    });

    const bridge = new WorkerBridge();
    workerBridgeRef.current = bridge;

    try {
      const response = await bridge.build(project, (progress) => {
        setBuildProgress(progress);
      });

      setBuildResult(response.result);
      setMsiBlob(response.blob);
    } catch (err: any) {
      console.error('Build failed:', err);
      alert(`Build Failed: ${err.message || String(err)}`);
    } finally {
      setIsBuilding(false);
      setBuildProgress(null);
      workerBridgeRef.current = null;
    }
  };

  const handleCancelBuild = () => {
    if (workerBridgeRef.current) {
      workerBridgeRef.current.terminate();
      workerBridgeRef.current = null;
    }
    setIsBuilding(false);
    setBuildProgress(null);
  };

  // Export .msibuilder
  const handleExport = async () => {
    try {
      const blob = await ProjectArchive.exportArchive(project);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.package.product_name.replace(/[^a-zA-Z0-9_-]/g, '') || 'project'}.msibuilder`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // Import .msibuilder
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await ProjectArchive.importArchive(file);
      setProject(imported);
      alert(`Successfully imported "${imported.name}" with ${imported.files.length} payloads!`);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Hidden file input for .msibuilder import */}
      <input
        ref={importInputRef}
        type="file"
        accept=".msibuilder,.zip"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Global Header */}
      <Header
        project={project}
        validationReport={validationReport}
        isBuilding={isBuilding}
        onValidate={() => setShowValidationModal(true)}
        onBuild={handleBuild}
        onExport={handleExport}
        onImport={() => importInputRef.current?.click()}
        onOpenStorage={() => setShowStorageModal(true)}
      />

      {/* Tab Navigation */}
      <Tabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        counts={counts}
        isPerUser={project.package.install_context === 'perUser'}
      />

      {/* Main Tab Views */}
      <main className="flex-1 px-6 pb-12 overflow-y-auto">
        {activeTab === 'package' && (
          <PackageInfoTab project={project} onChange={setProject} />
        )}
        {activeTab === 'files' && (
          <FilesTab project={project} onChange={setProject} />
        )}
        {activeTab === 'shortcuts' && (
          <ShortcutsTab project={project} onChange={setProject} />
        )}
        {activeTab === 'registry' && (
          <RegistryTab project={project} onChange={setProject} />
        )}
        {activeTab === 'services' && (
          <ServicesTab project={project} onChange={setProject} />
        )}
      </main>

      {/* Modals */}
      {showValidationModal && (
        <ValidationModal
          report={validationReport}
          onClose={() => setShowValidationModal(false)}
        />
      )}

      {isBuilding && (
        <BuildProgressModal
          progress={buildProgress}
          onCancel={handleCancelBuild}
        />
      )}

      {/* Post-Build Modal (only shown after a build completes) */}
      {buildResult && msiBlob && (
        <PostBuildModal
          buildResult={buildResult}
          project={project}
          msiBlob={msiBlob}
          onClose={() => {
            setBuildResult(null);
            setMsiBlob(null);
          }}
        />
      )}

      {showStorageModal && (
        <StorageModal
          project={project}
          onClose={() => setShowStorageModal(false)}
        />
      )}
    </div>
  );
};
