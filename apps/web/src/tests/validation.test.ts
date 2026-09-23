import { describe, it, expect } from 'vitest';
import { validateProject } from '../validation/schema';
import { createDefaultProject } from '../utils/defaultProject';
import { generateGuid } from '../utils/guid';

describe('validateProject', () => {
  it('detects missing files', () => {
    const project = createDefaultProject();
    project.files = [];
    const report = validateProject(project);
    expect(report.is_valid).toBe(false);
    expect(report.errors.some((e) => e.path === 'files')).toBe(true);
  });

  it('passes when project has valid file', () => {
    const project = createDefaultProject();
    project.files = [
      {
        id: 'f1',
        component_id: 'cmp_f1',
        component_guid: generateGuid(),
        source_ref: 'sha256_mock',
        source_display_name: 'test.exe',
        destination_directory: '',
        destination_name: 'test.exe',
        size: 100,
        key_path: true,
      },
    ];
    const report = validateProject(project);
    expect(report.is_valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('passes when project has empty folders without files', () => {
    const project = createDefaultProject();
    project.files = [];
    project.folders = [
      {
        id: 'fld1',
        path: 'logs',
        permission_preset: 'shared_all',
      },
    ];
    const report = validateProject(project);
    expect(report.is_valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('detects dangling shortcut target file', () => {
    const project = createDefaultProject();
    project.files = [
      {
        id: 'f1',
        component_id: 'cmp_f1',
        component_guid: generateGuid(),
        source_ref: 'sha256_mock',
        source_display_name: 'test.exe',
        destination_directory: '',
        destination_name: 'test.exe',
        size: 100,
        key_path: true,
      },
    ];
    project.shortcuts = [
      {
        id: 's1',
        name: 'Shortcut',
        location: 'startMenu',
        target_file_id: 'non_existent_file_id',
        show: 'normal',
        advertised: false,
      },
    ];
    const report = validateProject(project);
    expect(report.is_valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'dangling_file_reference')).toBe(true);
  });

  it('detects perUser service conflict', () => {
    const project = createDefaultProject();
    project.package.install_context = 'perUser';
    project.files = [
      {
        id: 'f1',
        component_id: 'cmp_f1',
        component_guid: generateGuid(),
        source_ref: 'sha256_mock',
        source_display_name: 'svc.exe',
        destination_directory: '',
        destination_name: 'svc.exe',
        size: 100,
        key_path: true,
      },
    ];
    project.services = [
      {
        id: 's1',
        name: 'MyDaemon',
        executable_file_id: 'f1',
        service_type: 'ownProcess',
        start_type: 'auto',
        error_control: 'normal',
        account: 'LocalSystem',
        dependencies: [],
        start_on_install: true,
        stop_on_uninstall: true,
        delete_on_uninstall: true,
        wait: true,
      },
    ];
    const report = validateProject(project);
    expect(report.is_valid).toBe(false);
    expect(report.errors.some((e) => e.code === 'per_user_service_invalid')).toBe(true);
  });
});
