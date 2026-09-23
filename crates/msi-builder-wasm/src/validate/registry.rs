use crate::model::{BuildDiagnostic, MsiBuilderProject};

pub fn validate_registry(project: &MsiBuilderProject, diagnostics: &mut Vec<BuildDiagnostic>) {
    let is_per_user = project.package.install_context == "perUser";

    for reg in &project.registry {
        let hive = reg.hive.to_uppercase();
        if hive != "HKLM" && hive != "HKCU" && hive != "HKCR" {
            diagnostics.push(BuildDiagnostic {
                code: "REG001".to_string(),
                severity: "error".to_string(),
                message: format!("Invalid registry hive '{}'", reg.hive),
                resource_type: Some("registry".to_string()),
                resource_id: Some(reg.id.clone()),
                detail: Some("Supported hives are HKLM, HKCU, and HKCR.".to_string()),
            });
        }

        if is_per_user && hive == "HKLM" {
            diagnostics.push(BuildDiagnostic {
                code: "REG004".to_string(),
                severity: "error".to_string(),
                message: format!("HKLM registry entry '{}' is incompatible with per-user installation", reg.key),
                resource_type: Some("registry".to_string()),
                resource_id: Some(reg.id.clone()),
                detail: Some("Per-user packages should write to HKCU rather than HKLM.".to_string()),
            });
        }

        if reg.key.trim().is_empty() {
            diagnostics.push(BuildDiagnostic {
                code: "REG002".to_string(),
                severity: "error".to_string(),
                message: "Registry key path is empty".to_string(),
                resource_type: Some("registry".to_string()),
                resource_id: Some(reg.id.clone()),
                detail: Some("Provide a subkey path, e.g. Software\\MyCompany\\MyApp.".to_string()),
            });
        }

        match reg.r#type.as_str() {
            "string" | "expandString" => {
                if !reg.value.is_string() {
                    diagnostics.push(BuildDiagnostic {
                        code: "REG003".to_string(),
                        severity: "error".to_string(),
                        message: format!("Value for string registry entry '{}' must be text", reg.key),
                        resource_type: Some("registry".to_string()),
                        resource_id: Some(reg.id.clone()),
                        detail: None,
                    });
                }
            }
            "dword" => {
                if !reg.value.is_number() && !reg.value.is_string() {
                    diagnostics.push(BuildDiagnostic {
                        code: "REG003".to_string(),
                        severity: "error".to_string(),
                        message: format!("Value for DWORD registry entry '{}' must be a number", reg.key),
                        resource_type: Some("registry".to_string()),
                        resource_id: Some(reg.id.clone()),
                        detail: None,
                    });
                }
            }
            "binary" => {
                if let Some(s) = reg.value.as_str() {
                    let cleaned = s.replace([' ', '-', ':'], "");
                    if hex::decode(&cleaned).is_err() {
                        diagnostics.push(BuildDiagnostic {
                            code: "REG003".to_string(),
                            severity: "error".to_string(),
                            message: format!("Binary registry entry '{}' contains invalid hex data", reg.key),
                            resource_type: Some("registry".to_string()),
                            resource_id: Some(reg.id.clone()),
                            detail: Some("Binary data must be valid hexadecimal bytes.".to_string()),
                        });
                    }
                } else {
                    diagnostics.push(BuildDiagnostic {
                        code: "REG003".to_string(),
                        severity: "error".to_string(),
                        message: format!("Value for binary registry entry '{}' must be a hex string", reg.key),
                        resource_type: Some("registry".to_string()),
                        resource_id: Some(reg.id.clone()),
                        detail: None,
                    });
                }
            }
            "multiString" => {
                if !reg.value.is_array() && !reg.value.is_string() {
                    diagnostics.push(BuildDiagnostic {
                        code: "REG003".to_string(),
                        severity: "error".to_string(),
                        message: format!("Value for multiString registry entry '{}' must be an array of strings or newline-separated text", reg.key),
                        resource_type: Some("registry".to_string()),
                        resource_id: Some(reg.id.clone()),
                        detail: None,
                    });
                }
            }
            other => {
                diagnostics.push(BuildDiagnostic {
                    code: "REG003".to_string(),
                    severity: "error".to_string(),
                    message: format!("Unsupported registry value type '{}'", other),
                    resource_type: Some("registry".to_string()),
                    resource_id: Some(reg.id.clone()),
                    detail: Some("Supported types are string, expandString, dword, binary, and multiString.".to_string()),
                });
            }
        }
    }
}
