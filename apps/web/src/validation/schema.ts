import { z } from 'zod';
import { MsiBuilderProject, ValidationReport } from '../types/models';

export const GUID_REGEX = /^\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}$/;
export const MSI_VERSION_REGEX = /^\d{1,5}(\.\d{1,5}){0,3}$/;

export const PackageConfigSchema = z.object({
  product_name: z.string().min(1, "Product Name is required").max(255),
  manufacturer: z.string().min(1, "Manufacturer is required").max(255),
  version: z.string().regex(MSI_VERSION_REGEX, "Version must be numeric format like 1.0.0 (up to 4 parts)"),
  description: z.string().max(255).optional(),
  product_code: z.string().regex(GUID_REGEX, "ProductCode must be a valid GUID enclosed in braces {GUID}"),
  upgrade_code: z.string().regex(GUID_REGEX, "UpgradeCode must be a valid GUID enclosed in braces {GUID}"),
  architecture_id: z.enum(['amd64', 'x86']).default('amd64'),
  install_context: z.enum(['perUser', 'perMachine']),
  install_root: z.string().min(1),
  install_subdirectory: z.string().min(1, "Install Subdirectory is required"),
  language: z.number().int().positive().default(1033),
  allow_uninstall: z.boolean().default(true),
  allow_repair: z.boolean().default(true),
  arp_entry: z.boolean().default(true),
  output_file_name: z.string().optional(),
  permission_preset: z.string().optional(),
  permission_sddl: z.string().optional(),
});

export const PackageFileSchema = z.object({
  id: z.string().min(1),
  component_id: z.string().min(1),
  component_guid: z.string().regex(GUID_REGEX, "Component GUID must be a valid GUID enclosed in braces"),
  source_ref: z.string().min(1, "Source file payload reference is required"),
  source_display_name: z.string().min(1),
  relative_source_path: z.string().optional(),
  destination_directory: z.string().default(''),
  destination_name: z.string().min(1, "Destination filename is required"),
  size: z.number().nonnegative(),
  last_modified: z.number().optional(),
  architecture_id: z.string().optional(),
  key_path: z.boolean().default(true),
  permission_preset: z.string().optional(),
  permission_sddl: z.string().optional(),
});

export const ShortcutConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Shortcut name is required"),
  location: z.enum(['startMenu', 'desktop']),
  start_menu_subdirectory: z.string().optional(),
  target_file_id: z.string().min(1, "Target file is required"),
  arguments: z.string().optional(),
  description: z.string().optional(),
  working_directory: z.string().optional(),
  show: z.enum(['normal', 'minimized', 'maximized']).default('normal'),
  advertised: z.boolean().default(false),
  icon_file_id: z.string().optional(),
  icon_index: z.number().int().optional(),
});

export const RegistryValueConfigSchema = z.object({
  id: z.string().min(1),
  hive: z.enum(['HKCU', 'HKLM', 'HKCR', 'HKU']),
  key: z.string().min(1, "Registry key is required"),
  name: z.string().optional(),
  type: z.enum(['string', 'expandString', 'dword', 'binary', 'multiString']),
  value: z.any(),
  registry_view: z.enum(['inherit', 'reg64', 'reg32']).default('inherit'),
  owner_file_id: z.string().optional(),
  component_id: z.string().optional(),
  component_guid: z.string().optional(),
  permission_preset: z.string().optional(),
  permission_sddl: z.string().optional(),
});

export const ServiceConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Service name is required").regex(/^[a-zA-Z0-9_-]+$/, "Service name must be alphanumeric"),
  display_name: z.string().optional(),
  description: z.string().optional(),
  executable_file_id: z.string().min(1, "Service executable file is required"),
  service_type: z.literal('ownProcess').default('ownProcess'),
  start_type: z.enum(['auto', 'demand', 'disabled']),
  error_control: z.enum(['ignore', 'normal', 'critical']),
  account: z.string().min(1, "Account name is required"),
  arguments: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
  start_on_install: z.boolean().default(true),
  stop_on_uninstall: z.boolean().default(true),
  delete_on_uninstall: z.boolean().default(true),
  wait: z.boolean().default(true),
  permission_preset: z.string().optional(),
  permission_sddl: z.string().optional(),
});

export const FolderConfigSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1, "Folder path is required"),
  component_id: z.string().optional(),
  component_guid: z.string().optional(),
  permission_preset: z.string().optional(),
  permission_sddl: z.string().optional(),
});

export const MsiBuilderProjectSchema = z.object({
  schema_version: z.number().default(1),
  id: z.string().min(1),
  name: z.string().min(1),
  package: PackageConfigSchema,
  files: z.array(PackageFileSchema).default([]),
  shortcuts: z.array(ShortcutConfigSchema).default([]),
  registry: z.array(RegistryValueConfigSchema).default([]),
  services: z.array(ServiceConfigSchema).default([]),
  folders: z.array(FolderConfigSchema).default([]),
  features: z.array(z.any()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});

export function validateProject(project: MsiBuilderProject): ValidationReport {
  const errors: { path: string; message: string; code: string }[] = [];
  const warnings: { path: string; message: string; code: string }[] = [];

  const parsed = MsiBuilderProjectSchema.safeParse(project);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      });
    }
  }

  if ((!project.files || project.files.length === 0) && (!project.folders || project.folders.length === 0)) {
    errors.push({
      path: 'files',
      message: 'At least one payload file or folder must be included in the project',
      code: 'empty_package',
    });
  }

  // Cross-reference checks
  const fileIds = new Set(project.files.map((f) => f.id));

  for (const sct of project.shortcuts) {
    if (!fileIds.has(sct.target_file_id)) {
      errors.push({
        path: `shortcuts[${sct.name}].target_file_id`,
        message: `Shortcut target file ID '${sct.target_file_id}' does not exist in payload files`,
        code: 'dangling_file_reference',
      });
    }
  }

  for (const svc of project.services) {
    if (!fileIds.has(svc.executable_file_id)) {
      errors.push({
        path: `services[${svc.name}].executable_file_id`,
        message: `Service executable file ID '${svc.executable_file_id}' does not exist in payload files`,
        code: 'dangling_file_reference',
      });
    }

    if (project.package.install_context === 'perUser') {
      errors.push({
        path: `services[${svc.name}]`,
        message: `Windows Services cannot be installed in per-user context. Switch Package Install Scope to per-machine or remove service.`,
        code: 'per_user_service_invalid',
      });
    }
  }

  // Check registry permissions
  for (const reg of project.registry) {
    if (project.package.install_context === 'perUser' && reg.hive === 'HKLM') {
      warnings.push({
        path: `registry[${reg.key}]`,
        message: `Writing to HKLM in a per-user installation may fail if standard users run the installer without elevation.`,
        code: 'hklm_in_per_user',
      });
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}
