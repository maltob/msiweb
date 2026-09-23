use crate::model::{BuildDiagnostic, MsiBuilderProject};

pub fn validate_architecture(project: &MsiBuilderProject, diagnostics: &mut Vec<BuildDiagnostic>) {
    let pkg = &project.package;
    let arch = pkg.architecture_id.to_lowercase();

    if arch != "x86" && arch != "amd64" {
        diagnostics.push(BuildDiagnostic {
            code: "ARC001".to_string(),
            severity: "error".to_string(),
            message: format!("Unsupported architecture '{}'", pkg.architecture_id),
            resource_type: Some("architecture".to_string()),
            resource_id: None,
            detail: Some("Supported architectures are 'x86' (32-bit) and 'amd64' (64-bit / x64).".to_string()),
        });
    }

    if arch == "x86" && pkg.install_root == "ProgramFiles64Folder" {
        diagnostics.push(BuildDiagnostic {
            code: "ARC002".to_string(),
            severity: "error".to_string(),
            message: "x86 package cannot use ProgramFiles64Folder as install root".to_string(),
            resource_type: Some("architecture".to_string()),
            resource_id: None,
            detail: Some("Use ProgramFilesFolder for 32-bit packages.".to_string()),
        });
    }

    if arch == "amd64" && pkg.install_root == "ProgramFilesFolder" {
        diagnostics.push(BuildDiagnostic {
            code: "ARC003".to_string(),
            severity: "warning".to_string(),
            message: "64-bit package is using 32-bit ProgramFilesFolder".to_string(),
            resource_type: Some("architecture".to_string()),
            resource_id: None,
            detail: Some("Normally 64-bit packages install under ProgramFiles64Folder unless intentionally installing 32-bit binaries.".to_string()),
        });
    }
}
