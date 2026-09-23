use crate::model::{BuildDiagnostic, MsiBuilderProject};
use std::collections::HashMap;

pub fn validate_services(project: &MsiBuilderProject, diagnostics: &mut Vec<BuildDiagnostic>) {
    if project.services.is_empty() {
        return;
    }

    if project.package.install_context == "perUser" {
        diagnostics.push(BuildDiagnostic {
            code: "SVC001".to_string(),
            severity: "error".to_string(),
            message: "Windows services require a per-machine installation".to_string(),
            resource_type: Some("service".to_string()),
            resource_id: None,
            detail: Some("Set Installation Context to 'perMachine' or remove all Windows services.".to_string()),
        });
    }

    let files_by_id: HashMap<&str, &crate::model::PackageFile> =
        project.files.iter().map(|f| (f.id.as_str(), f)).collect();

    for svc in &project.services {
        if svc.name.trim().is_empty() {
            diagnostics.push(BuildDiagnostic {
                code: "SVC002".to_string(),
                severity: "error".to_string(),
                message: "Service name cannot be empty".to_string(),
                resource_type: Some("service".to_string()),
                resource_id: Some(svc.id.clone()),
                detail: None,
            });
        } else if svc.name.contains('/') || svc.name.contains('\\') {
            diagnostics.push(BuildDiagnostic {
                code: "SVC002".to_string(),
                severity: "error".to_string(),
                message: format!("Service name '{}' contains invalid characters", svc.name),
                resource_type: Some("service".to_string()),
                resource_id: Some(svc.id.clone()),
                detail: Some("Service name cannot contain slashes or backslashes.".to_string()),
            });
        }

        if let Some(file) = files_by_id.get(svc.executable_file_id.as_str()) {
            if !file.destination_name.to_lowercase().ends_with(".exe") {
                diagnostics.push(BuildDiagnostic {
                    code: "SVC003".to_string(),
                    severity: "warning".to_string(),
                    message: format!("Service executable '{}' does not have a .exe extension", file.destination_name),
                    resource_type: Some("service".to_string()),
                    resource_id: Some(svc.id.clone()),
                    detail: Some("Windows service binaries normally end with .exe.".to_string()),
                });
            }
            if !file.key_path {
                diagnostics.push(BuildDiagnostic {
                    code: "SVC004".to_string(),
                    severity: "error".to_string(),
                    message: format!("Service executable file '{}' is not the KeyPath of its component", file.destination_name),
                    resource_type: Some("service".to_string()),
                    resource_id: Some(svc.id.clone()),
                    detail: Some("Windows Installer requires the ServiceInstall executable to be the component's KeyPath.".to_string()),
                });
            }
        } else {
            diagnostics.push(BuildDiagnostic {
                code: "SVC003".to_string(),
                severity: "error".to_string(),
                message: format!("Service '{}' references nonexistent executable file ID '{}'", svc.name, svc.executable_file_id),
                resource_type: Some("service".to_string()),
                resource_id: Some(svc.id.clone()),
                detail: Some("Select an existing packaged .exe file as the service executable.".to_string()),
            });
        }

        let start_type = svc.start_type.to_lowercase();
        if start_type != "auto" && start_type != "demand" && start_type != "disabled" {
            diagnostics.push(BuildDiagnostic {
                code: "SVC005".to_string(),
                severity: "error".to_string(),
                message: format!("Unsupported service startup type '{}'", svc.start_type),
                resource_type: Some("service".to_string()),
                resource_id: Some(svc.id.clone()),
                detail: Some("Supported startup types are 'auto', 'demand' (manual), and 'disabled'.".to_string()),
            });
        }

        let acct = svc.account.as_str();
        if acct != "LocalSystem" && acct != "LocalService" && acct != "NetworkService" {
            diagnostics.push(BuildDiagnostic {
                code: "SVC006".to_string(),
                severity: "error".to_string(),
                message: format!("Unsupported service account '{}'", svc.account),
                resource_type: Some("service".to_string()),
                resource_id: Some(svc.id.clone()),
                detail: Some("MVP supports built-in service accounts: LocalSystem, LocalService, and NetworkService.".to_string()),
            });
        }
    }
}
