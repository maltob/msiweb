import { describe, it, expect } from 'vitest';
import { getArchitectureProfile } from '../types/architectures';

describe('Architecture Registry', () => {
  it('correctly resolves amd64 profile', () => {
    const profile = getArchitectureProfile('amd64');
    expect(profile.is64Bit).toBe(true);
    expect(profile.templateSummary).toBe('x64');
    expect(profile.defaultPerMachineRoot).toBe('ProgramFiles64Folder');
    expect(profile.componentAttributes).toBe(256);
  });

  it('correctly resolves x86 profile', () => {
    const profile = getArchitectureProfile('x86');
    expect(profile.is64Bit).toBe(false);
    expect(profile.templateSummary).toBe('Intel');
    expect(profile.defaultPerMachineRoot).toBe('ProgramFilesFolder');
    expect(profile.componentAttributes).toBe(0);
  });

  it('falls back to amd64 for unknown architecture', () => {
    const profile = getArchitectureProfile('unknown_arch');
    expect(profile.id).toBe('amd64');
  });
});
