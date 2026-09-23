use crate::model::{BuildDiagnostic, MsiBuilderProject};
use std::collections::HashSet;

pub fn validate_shortcuts(project: &MsiBuilderProject, diagnostics: &mut Vec<BuildDiagnostic>) {
    let file_ids: HashSet<&str> = project.files.iter().map(|f| f.id.as_str()).collect();

    for shortcut in &project.shortcuts {
        if shortcut.name.trim().is_empty() {
            diagnostics.push(BuildDiagnostic {
                code: "SCT002".to_string(),
                severity: "error".to_string(),
                message: "Shortcut name is empty".to_string(),
                resource_type: Some("shortcut".to_string()),
                resource_id: Some(shortcut.id.clone()),
                detail: Some("Specify a display name for the shortcut.".to_string()),
            });
        }

        if !file_ids.contains(shortcut.target_file_id.as_str()) {
            diagnostics.push(BuildDiagnostic {
                code: "SCT001".to_string(),
                severity: "error".to_string(),
                message: format!("Shortcut '{}' references nonexistent target file ID '{}'", shortcut.name, shortcut.target_file_id),
                resource_type: Some("shortcut".to_string()),
                resource_id: Some(shortcut.id.clone()),
                detail: Some("Select an existing package file as the shortcut target.".to_string()),
            });
        }

        if shortcut.location != "startMenu" && shortcut.location != "desktop" {
            diagnostics.push(BuildDiagnostic {
                code: "SCT003".to_string(),
                severity: "error".to_string(),
                message: format!("Invalid shortcut location '{}'", shortcut.location),
                resource_type: Some("shortcut".to_string()),
                resource_id: Some(shortcut.id.clone()),
                detail: Some("Shortcut location must be 'startMenu' or 'desktop'.".to_string()),
            });
        }
    }
}
