export interface ArchitectureProfile {
  id: string;
  name: string;
  templateSummary: string; // 'Intel' or 'x64'
  defaultPerMachineRoot: string; // 'ProgramFilesFolder' or 'ProgramFiles64Folder'
  componentAttributes: number; // 0 for 32-bit, 256 for 64-bit
  is64Bit: boolean;
}

export const ARCHITECTURE_PROFILES: Record<string, ArchitectureProfile> = {
  amd64: {
    id: 'amd64',
    name: 'x64 (64-bit AMD/Intel)',
    templateSummary: 'x64',
    defaultPerMachineRoot: 'ProgramFiles64Folder',
    componentAttributes: 256,
    is64Bit: true,
  },
  x86: {
    id: 'x86',
    name: 'x86 (32-bit Intel)',
    templateSummary: 'Intel',
    defaultPerMachineRoot: 'ProgramFilesFolder',
    componentAttributes: 0,
    is64Bit: false,
  },
};

export function getArchitectureProfile(id: string): ArchitectureProfile {
  const norm = id.toLowerCase();
  return ARCHITECTURE_PROFILES[norm] || ARCHITECTURE_PROFILES.amd64;
}
