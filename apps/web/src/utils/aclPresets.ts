export interface AclPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  sddl?: string;
  targets: Array<'folder' | 'file' | 'registry' | 'service'>;
  explanation: {
    trustees: string[];
    permissions: string[];
  };
}

export const ACL_PRESETS: AclPreset[] = [
  {
    id: 'none',
    name: 'Default / Inherited',
    badge: 'Default',
    description: 'Inherits standard Windows permissions from the parent container or system default. No custom ACL entry is written.',
    targets: ['folder', 'file', 'registry', 'service'],
    explanation: {
      trustees: ['Inherited from parent directory or system container'],
      permissions: ['Standard Windows default permissions'],
    },
  },
  {
    id: 'shared_all',
    name: 'Shared Data (Full Access for Users)',
    badge: 'Shared / Full Access',
    description: 'Grants Everyone (WD), Administrators (BA), and SYSTEM (SY) Full Control. Ideal for shared application data, logs, or writable databases.',
    sddl: 'D:(A;OICI;GA;;;WD)(A;OICI;GA;;;BA)(A;OICI;GA;;;SY)',
    targets: ['folder', 'file', 'registry'],
    explanation: {
      trustees: ['WD: Everyone (World)', 'BA: Built-in Administrators', 'SY: SYSTEM'],
      permissions: ['GA: Full Control (Generic All)', 'OI/CI: Subfolders and files inherit this access'],
    },
  },
  {
    id: 'admin_only',
    name: 'Secure / Admin Only',
    badge: 'Restricted / Admin Only',
    description: 'Blocks inheritance (P) and grants Full Control only to Administrators and SYSTEM. Ideal for sensitive configs, certificates, or protected binaries.',
    sddl: 'D:P(A;OICI;GA;;;BA)(A;OICI;GA;;;SY)',
    targets: ['folder', 'file', 'registry'],
    explanation: {
      trustees: ['BA: Built-in Administrators', 'SY: SYSTEM'],
      permissions: ['P: Protected inheritance (blocks parent rules)', 'GA: Full Control (Generic All)'],
    },
  },
  {
    id: 'readonly_users',
    name: 'User Read-Only (Admins Full)',
    badge: 'Read-Only Users',
    description: 'Grants Built-in Standard Users (BU) Read & Execute rights, while Administrators and SYSTEM retain Full Control.',
    sddl: 'D:(A;OICI;GRGX;;;BU)(A;OICI;GA;;;BA)(A;OICI;GA;;;SY)',
    targets: ['folder', 'file', 'registry'],
    explanation: {
      trustees: ['BU: Built-in Users', 'BA: Built-in Administrators', 'SY: SYSTEM'],
      permissions: ['GRGX: Generic Read & Execute for Users', 'GA: Full Control for Admins'],
    },
  },
  {
    id: 'service_user_control',
    name: 'Service Start/Stop for Users',
    badge: 'Service Start/Stop',
    description: 'Allows Authenticated Users (AU) to Start, Stop, and Query service status without requiring local Administrator privileges.',
    sddl: 'D:(A;;CCLCSWRPWPDTLORC;;;AU)(A;;CCDCLCSWRPWPDTLOSDRCWDWO;;;BA)(A;;CCLCSWRPWPDTLORC;;;SY)',
    targets: ['service'],
    explanation: {
      trustees: ['AU: Authenticated Users', 'BA: Built-in Administrators', 'SY: SYSTEM'],
      permissions: ['RP/WP: Start & Stop service', 'CC/LC: Query config and status', 'BA: Full service management access'],
    },
  },
  {
    id: 'custom',
    name: 'Custom SDDL',
    badge: 'Custom SDDL',
    description: 'Specify an arbitrary Security Descriptor Definition Language (SDDL) string.',
    targets: ['folder', 'file', 'registry', 'service'],
    explanation: {
      trustees: ['Custom Security Principals'],
      permissions: ['Custom Security Descriptor'],
    },
  },
];

export function getAclPresetsForTarget(target: 'folder' | 'file' | 'registry' | 'service'): AclPreset[] {
  return ACL_PRESETS.filter((p) => p.targets.includes(target));
}

export function getPresetById(id?: string): AclPreset | undefined {
  if (!id) return undefined;
  return ACL_PRESETS.find((p) => p.id === id);
}

export function getPresetSddl(presetId?: string): string | undefined {
  const preset = getPresetById(presetId);
  return preset?.sddl;
}
