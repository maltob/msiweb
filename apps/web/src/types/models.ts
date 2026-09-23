export type InstallContext = 'perUser' | 'perMachine';
export type ShortcutLocation = 'startMenu' | 'desktop';
export type RegistryHive = 'HKCU' | 'HKLM' | 'HKCR' | 'HKU';
export type RegistryValueType = 'string' | 'expandString' | 'dword' | 'binary' | 'multiString';
export type ServiceStartType = 'auto' | 'demand' | 'disabled';
export type ServiceErrorControl = 'ignore' | 'normal' | 'critical';

export interface PackageConfig {
  product_name: string;
  manufacturer: string;
  version: string;
  description?: string;
  product_code: string;
  upgrade_code: string;
  architecture_id: string; // 'x86' | 'amd64' | extensible
  install_context: InstallContext;
  install_root: string; // e.g. 'ProgramFiles64Folder' or 'LocalAppDataFolder'
  install_subdirectory: string;
  language: number; // default 1033
  allow_uninstall: boolean;
  allow_repair: boolean;
  arp_entry: boolean;
  output_file_name?: string;
  permission_preset?: string;
  permission_sddl?: string;
}

export interface PackageFile {
  id: string;
  component_id: string;
  component_guid: string;
  source_ref: string; // SHA-256 hash or OPFS relative file path
  source_display_name: string;
  relative_source_path?: string;
  destination_directory: string;
  destination_name: string;
  size: number;
  last_modified?: number;
  architecture_id?: string;
  key_path: boolean;
  permission_preset?: string;
  permission_sddl?: string;
}

export interface ShortcutConfig {
  id: string;
  name: string;
  location: ShortcutLocation;
  start_menu_subdirectory?: string;
  target_file_id: string;
  arguments?: string;
  description?: string;
  working_directory?: string;
  show: 'normal' | 'minimized' | 'maximized';
  advertised: boolean;
  icon_file_id?: string;
  icon_index?: number;
}

export interface RegistryValueConfig {
  id: string;
  hive: RegistryHive;
  key: string;
  name?: string;
  type: RegistryValueType;
  value: any; // string, number, string[]
  registry_view: 'inherit' | 'reg64' | 'reg32';
  owner_file_id?: string;
  component_id?: string;
  component_guid?: string;
  permission_preset?: string;
  permission_sddl?: string;
}

export interface ServiceConfig {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  executable_file_id: string;
  service_type: 'ownProcess';
  start_type: ServiceStartType;
  error_control: ServiceErrorControl;
  account: string; // e.g. 'LocalSystem', 'LocalService'
  arguments?: string;
  dependencies: string[];
  start_on_install: boolean;
  stop_on_uninstall: boolean;
  delete_on_uninstall: boolean;
  wait: boolean;
  permission_preset?: string;
  permission_sddl?: string;
}

export interface FeatureConfig {
  id: string;
  title: string;
  description?: string;
  parent_id?: string;
  display: number;
  level: number;
  directory_id?: string;
  attributes: number;
}

export interface FolderConfig {
  id: string;
  path: string; // e.g. "logs", "data/cache" (relative to installation directory)
  component_id?: string;
  component_guid?: string;
  permission_preset?: string;
  permission_sddl?: string;
}

export interface MsiBuilderProject {
  schema_version: number;
  id: string;
  name: string;
  package: PackageConfig;
  files: PackageFile[];
  shortcuts: ShortcutConfig[];
  registry: RegistryValueConfig[];
  services: ServiceConfig[];
  folders?: FolderConfig[];
  features: FeatureConfig[];
  created_at: string;
  updated_at: string;
}

export interface BuildMetadata {
  product_code: string;
  upgrade_code: string;
  file_count: number;
  component_count: number;
  shortcut_count: number;
  registry_count: number;
  service_count: number;
}

export interface BuildResult {
  file_name: string;
  size: number;
  sha256: string;
  metadata: BuildMetadata;
}

export type BuildStep = 'validating' | 'preparing_storage' | 'building_cabinet' | 'generating_database' | 'finalizing' | 'complete';

export interface BuildProgress {
  step: BuildStep;
  current: number;
  total: number;
  message: string;
}

export interface ValidationErrorItem {
  path: string;
  message: string;
  code: string;
}

export interface ValidationReport {
  is_valid: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
}
