import { MsiBuilderProject } from '../types/models';
import { generateGuid } from './guid';

export function createDefaultProject(): MsiBuilderProject {
  const now = new Date().toISOString();
  return {
    schema_version: 1,
    id: `project_${Date.now()}`,
    name: 'My Windows Application',
    package: {
      product_name: 'My Windows App',
      manufacturer: 'Acme Corporation',
      version: '1.0.0',
      description: 'Built with Web MSI Builder',
      product_code: generateGuid(),
      upgrade_code: generateGuid(),
      architecture_id: 'amd64',
      install_context: 'perUser',
      install_root: 'LocalAppDataFolder',
      install_subdirectory: 'MyWindowsApp',
      language: 1033,
      allow_uninstall: true,
      allow_repair: true,
      arp_entry: true,
      output_file_name: 'MyWindowsApp-1.0.0-x64.msi',
    },
    files: [],
    shortcuts: [],
    registry: [],
    services: [],
    folders: [],
    features: [],
    created_at: now,
    updated_at: now,
  };
}
