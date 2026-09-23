use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MsiBuilderProject {
    #[serde(alias = "schema_version")]
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub package: PackageConfig,
    pub files: Vec<PackageFile>,
    pub shortcuts: Vec<ShortcutConfig>,
    pub registry: Vec<RegistryValueConfig>,
    pub services: Vec<ServiceConfig>,
    #[serde(default)]
    pub folders: Vec<FolderConfig>,
    #[serde(default)]
    pub features: Vec<InstallFeature>,
    #[serde(alias = "created_at")]
    pub created_at: String,
    #[serde(alias = "updated_at")]
    pub updated_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageConfig {
    #[serde(alias = "product_name")]
    pub product_name: String,
    pub manufacturer: String,
    pub version: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(alias = "product_code")]
    pub product_code: String,
    #[serde(alias = "upgrade_code")]
    pub upgrade_code: String,
    #[serde(alias = "architecture_id")]
    pub architecture_id: String, // "x86", "amd64"
    #[serde(alias = "install_context")]
    pub install_context: String, // "perMachine", "perUser"
    #[serde(alias = "install_root")]
    pub install_root: String,    // "ProgramFilesFolder", "ProgramFiles64Folder", "LocalAppDataFolder"
    #[serde(alias = "install_subdirectory")]
    pub install_subdirectory: String,
    pub language: u16,
    #[serde(alias = "allow_uninstall")]
    pub allow_uninstall: bool,
    #[serde(alias = "allow_repair")]
    pub allow_repair: bool,
    #[serde(alias = "arp_entry")]
    pub arp_entry: bool,
    #[serde(default, alias = "output_file_name")]
    pub output_file_name: Option<String>,
    #[serde(default, alias = "permission_preset")]
    pub permission_preset: Option<String>,
    #[serde(default, alias = "permission_sddl")]
    pub permission_sddl: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageFile {
    pub id: String,
    #[serde(alias = "component_id")]
    pub component_id: String,
    #[serde(alias = "component_guid")]
    pub component_guid: String,
    #[serde(alias = "source_ref")]
    pub source_ref: String,
    #[serde(alias = "source_display_name")]
    pub source_display_name: String,
    #[serde(default, alias = "relative_source_path")]
    pub relative_source_path: Option<String>,
    #[serde(alias = "destination_directory")]
    pub destination_directory: String,
    #[serde(alias = "destination_name")]
    pub destination_name: String,
    pub size: u64,
    #[serde(default, alias = "last_modified")]
    pub last_modified: Option<u64>,
    #[serde(default, alias = "architecture_id")]
    pub architecture_id: Option<String>,
    #[serde(alias = "key_path")]
    pub key_path: bool,
    #[serde(default, alias = "permission_preset")]
    pub permission_preset: Option<String>,
    #[serde(default, alias = "permission_sddl")]
    pub permission_sddl: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderConfig {
    pub id: String,
    pub path: String, // e.g. "logs", "data/cache" (relative to INSTALLDIR)
    #[serde(default, alias = "component_id")]
    pub component_id: Option<String>,
    #[serde(default, alias = "component_guid")]
    pub component_guid: Option<String>,
    #[serde(default, alias = "permission_preset")]
    pub permission_preset: Option<String>,
    #[serde(default, alias = "permission_sddl")]
    pub permission_sddl: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutConfig {
    pub id: String,
    pub name: String,
    pub location: String, // "startMenu", "desktop"
    #[serde(default, alias = "start_menu_subdirectory")]
    pub start_menu_subdirectory: Option<String>,
    #[serde(alias = "target_file_id")]
    pub target_file_id: String,
    #[serde(default)]
    pub arguments: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default, alias = "working_directory")]
    pub working_directory: Option<String>,
    #[serde(default = "default_show_normal")]
    pub show: String, // "normal", "minimized", "maximized"
    #[serde(default)]
    pub advertised: bool,
    #[serde(default, alias = "icon_file_id")]
    pub icon_file_id: Option<String>,
    #[serde(default, alias = "icon_index")]
    pub icon_index: Option<i16>,
}

fn default_show_normal() -> String {
    "normal".to_string()
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistryValueConfig {
    pub id: String,
    pub hive: String, // "HKLM", "HKCU", "HKCR"
    pub key: String,
    pub name: Option<String>,
    pub r#type: String, // "string", "expandString", "dword", "binary", "multiString"
    pub value: serde_json::Value,
    #[serde(default = "default_registry_view", alias = "registry_view")]
    pub registry_view: String, // "inherit", "32", "64"
    #[serde(default, alias = "owner_file_id")]
    pub owner_file_id: Option<String>,
    #[serde(default, alias = "component_id")]
    pub component_id: Option<String>,
    #[serde(default, alias = "component_guid")]
    pub component_guid: Option<String>,
    #[serde(default, alias = "permission_preset")]
    pub permission_preset: Option<String>,
    #[serde(default, alias = "permission_sddl")]
    pub permission_sddl: Option<String>,
}

fn default_registry_view() -> String {
    "inherit".to_string()
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceConfig {
    pub id: String,
    pub name: String,
    #[serde(default, alias = "display_name")]
    pub display_name: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(alias = "executable_file_id")]
    pub executable_file_id: String,
    #[serde(default)]
    pub arguments: Option<String>,
    #[serde(alias = "start_type")]
    pub start_type: String,   // "auto", "demand", "disabled"
    #[serde(alias = "error_control")]
    pub error_control: String, // "ignore", "normal", "critical"
    pub account: String,      // "LocalSystem", "LocalService", "NetworkService"
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default = "default_true", alias = "start_on_install")]
    pub start_on_install: bool,
    #[serde(default = "default_true", alias = "stop_on_uninstall")]
    pub stop_on_uninstall: bool,
    #[serde(default = "default_true", alias = "delete_on_uninstall")]
    pub delete_on_uninstall: bool,
    #[serde(default = "default_true")]
    pub wait: bool,
    #[serde(default, alias = "permission_preset")]
    pub permission_preset: Option<String>,
    #[serde(default, alias = "permission_sddl")]
    pub permission_sddl: Option<String>,
}

fn default_true() -> bool {
    true
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallFeature {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub parent_id: Option<String>,
    #[serde(default = "default_local")]
    pub default_state: String, // "local", "absent"
    #[serde(default)]
    pub configurable: bool,
}

fn default_local() -> String {
    "local".to_string()
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchitectureProfile {
    pub id: String,
    pub label: String,
    pub enabled: bool,
    pub msi_template_token: String,
    pub program_files_root: String,
    pub component_bitness: String, // "32" | "64"
    pub registry_default_view: String, // "32" | "64"
    pub validation_capabilities: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildDiagnostic {
    pub code: String,
    pub severity: String, // "error" | "warning" | "info"
    pub message: String,
    #[serde(default)]
    pub resource_type: Option<String>,
    #[serde(default)]
    pub resource_id: Option<String>,
    #[serde(default)]
    pub detail: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildResult {
    pub file_name: String,
    pub size: u64,
    pub sha256: String,
    pub metadata: BuildMetadata,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildMetadata {
    pub product_code: String,
    pub upgrade_code: String,
    pub file_count: usize,
    pub component_count: usize,
    pub shortcut_count: usize,
    pub registry_count: usize,
    pub service_count: usize,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationReport {
    #[serde(alias = "is_valid")]
    pub is_valid: bool,
    pub errors: Vec<BuildDiagnostic>,
    pub warnings: Vec<BuildDiagnostic>,
}

