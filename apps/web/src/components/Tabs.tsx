import React from 'react';
import { Files } from 'lucide-react';
import { 
  MsiPackageManifestIcon, 
  WindowsShortcutIcon, 
  WindowsRegistryIcon, 
  WindowsServiceIcon 
} from './icons/CustomIcons';

export type TabId = 'package' | 'files' | 'shortcuts' | 'registry' | 'services';

interface TabsProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  counts: {
    files: number;
    shortcuts: number;
    registry: number;
    services: number;
  };
  isPerUser?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onChangeTab, counts, isPerUser }) => {
  const tabItems: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'package',
      label: 'Package Info',
      icon: <MsiPackageManifestIcon className="w-4 h-4" />,
    },
    {
      id: 'files',
      label: 'Files & Payload',
      icon: <Files className="w-4 h-4" />,
      count: counts.files,
    },
    {
      id: 'shortcuts',
      label: 'Shortcuts',
      icon: <WindowsShortcutIcon className="w-4 h-4" />,
      count: counts.shortcuts,
    },
    {
      id: 'registry',
      label: 'Registry',
      icon: <WindowsRegistryIcon className="w-4 h-4" />,
      count: counts.registry,
    },
    {
      id: 'services',
      label: 'Services',
      icon: <WindowsServiceIcon className="w-4 h-4" />,
      count: counts.services,
    },
  ];

  return (
    <nav className="flex space-x-1 border-b border-slate-800 bg-slate-900/50 px-6 pt-2">
      {tabItems.map((tab) => {
        const isDisabled = tab.id === 'services' && isPerUser;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => !isDisabled && onChangeTab(tab.id)}
            disabled={isDisabled}
            title={isDisabled ? 'Windows Services cannot be installed in Per-User mode' : undefined}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition relative ${
              isDisabled
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-600'
                : isActive
                ? 'border-brand-500 text-brand-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className={isDisabled ? 'text-slate-600' : isActive ? 'text-brand-400' : 'text-slate-500'}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
            {isDisabled && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-500 border border-slate-700">
                Disabled
              </span>
            )}
            {!isDisabled && typeof tab.count === 'number' && (
              <span
                className={`ml-1.5 px-2 py-0.5 text-xs font-semibold rounded-full ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
