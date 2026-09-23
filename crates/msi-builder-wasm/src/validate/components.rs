use crate::model::{BuildDiagnostic, MsiBuilderProject};
use crate::validate::package::is_valid_guid;
use std::collections::HashSet;

pub fn validate_files_and_components(project: &MsiBuilderProject, diagnostics: &mut Vec<BuildDiagnostic>) {
    if project.files.is_empty() && project.folders.is_empty() {
        diagnostics.push(BuildDiagnostic {
            code: "FIL001".to_string(),
            severity: "error".to_string(),
            message: "Package contains no files or folders".to_string(),
            resource_type: Some("file".to_string()),
            resource_id: None,
            detail: Some("Add at least one application payload file or folder to the package.".to_string()),
        });
        return;
    }

    let mut dest_paths = HashSet::new();
    let mut component_ids = HashSet::new();
    let is_64bit = project.package.architecture_id.to_lowercase() == "amd64";

    for file in &project.files {
        let full_dest = format!("{}/{}", file.destination_directory.trim_matches('/'), file.destination_name);
        let normalized = full_dest.to_lowercase();
        if !dest_paths.insert(normalized) {
            diagnostics.push(BuildDiagnostic {
                code: "FIL002".to_string(),
                severity: "error".to_string(),
                message: format!("Duplicate destination file path: '{}'", full_dest),
                resource_type: Some("file".to_string()),
                resource_id: Some(file.id.clone()),
                detail: Some("Multiple files cannot be installed to the exact same destination path.".to_string()),
            });
        }

        if file.destination_name.trim().is_empty() {
            diagnostics.push(BuildDiagnostic {
                code: "FIL003".to_string(),
                severity: "error".to_string(),
                message: "Destination filename is empty".to_string(),
                resource_type: Some("file".to_string()),
                resource_id: Some(file.id.clone()),
                detail: Some("Each file must have a destination filename.".to_string()),
            });
        } else if file.destination_name.contains('/') || file.destination_name.contains('\\') {
            diagnostics.push(BuildDiagnostic {
                code: "FIL003".to_string(),
                severity: "error".to_string(),
                message: format!("Destination filename '{}' contains path separators", file.destination_name),
                resource_type: Some("file".to_string()),
                resource_id: Some(file.id.clone()),
                detail: Some("Use destinationDirectory for folder path and destinationName only for the file name.".to_string()),
            });
        }

        if !is_valid_guid(&file.component_guid) {
            diagnostics.push(BuildDiagnostic {
                code: "CMP001".to_string(),
                severity: "error".to_string(),
                message: format!("Component GUID '{}' for file '{}' is invalid", file.component_guid, file.destination_name),
                resource_type: Some("file".to_string()),
                resource_id: Some(file.id.clone()),
                detail: Some("Every component must have a valid GUID.".to_string()),
            });
        }

        if !component_ids.insert(file.component_id.clone()) {
            diagnostics.push(BuildDiagnostic {
                code: "CMP002".to_string(),
                severity: "warning".to_string(),
                message: format!("Duplicate component ID '{}'", file.component_id),
                resource_type: Some("file".to_string()),
                resource_id: Some(file.id.clone()),
                detail: Some("For MVP each payload file is recommended to have its own unique component.".to_string()),
            });
        }

        if let Some(ref file_arch) = file.architecture_id {
            if file_arch.to_lowercase() == "amd64" && !is_64bit {
                diagnostics.push(BuildDiagnostic {
                    code: "CMP003".to_string(),
                    severity: "error".to_string(),
                    message: format!("64-bit file '{}' in a 32-bit package", file.destination_name),
                    resource_type: Some("file".to_string()),
                    resource_id: Some(file.id.clone()),
                    detail: Some("A 32-bit package cannot install 64-bit components.".to_string()),
                });
            }
        }
    }

    let mut folder_paths = HashSet::new();
    for fld in &project.folders {
        let clean = fld.path.trim_matches(['/', '\\']).replace('\\', "/");
        if clean.is_empty() || clean == "." {
            diagnostics.push(BuildDiagnostic {
                code: "FLD001".to_string(),
                severity: "error".to_string(),
                message: "Folder path cannot be empty or root".to_string(),
                resource_type: Some("folder".to_string()),
                resource_id: Some(fld.id.clone()),
                detail: Some("Specify a relative subdirectory path, e.g., 'logs' or 'data/cache'.".to_string()),
            });
        }

        if !folder_paths.insert(clean.to_lowercase()) {
            diagnostics.push(BuildDiagnostic {
                code: "FLD002".to_string(),
                severity: "warning".to_string(),
                message: format!("Duplicate folder definition: '{}'", fld.path),
                resource_type: Some("folder".to_string()),
                resource_id: Some(fld.id.clone()),
                detail: Some("Multiple folder definitions target the same relative directory.".to_string()),
            });
        }

        if let Some(ref guid) = fld.component_guid {
            if !is_valid_guid(guid) {
                diagnostics.push(BuildDiagnostic {
                    code: "FLD003".to_string(),
                    severity: "error".to_string(),
                    message: format!("Component GUID '{}' for folder '{}' is invalid", guid, fld.path),
                    resource_type: Some("folder".to_string()),
                    resource_id: Some(fld.id.clone()),
                    detail: Some("Folder component GUID must be formatted as '{XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}'.".to_string()),
                });
            }
        }
    }
}

