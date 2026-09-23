use crate::model::{BuildDiagnostic, MsiBuilderProject};
use uuid::Uuid;

pub fn validate_package(project: &MsiBuilderProject, diagnostics: &mut Vec<BuildDiagnostic>) {
    let pkg = &project.package;

    if pkg.product_name.trim().is_empty() {
        diagnostics.push(BuildDiagnostic {
            code: "PKG001".to_string(),
            severity: "error".to_string(),
            message: "Product name is required".to_string(),
            resource_type: Some("package".to_string()),
            resource_id: None,
            detail: Some("Provide a user-friendly product name for the package.".to_string()),
        });
    }

    if !is_valid_msi_version(&pkg.version) {
        diagnostics.push(BuildDiagnostic {
            code: "PKG002".to_string(),
            severity: "error".to_string(),
            message: format!("Invalid product version '{}'", pkg.version),
            resource_type: Some("package".to_string()),
            resource_id: None,
            detail: Some("Version must be in format major.minor.build (e.g. 1.0.0), with major <= 255, minor <= 255, build <= 65535.".to_string()),
        });
    }

    if !is_valid_guid(&pkg.product_code) {
        diagnostics.push(BuildDiagnostic {
            code: "PKG003".to_string(),
            severity: "error".to_string(),
            message: format!("ProductCode '{}' is not a valid GUID", pkg.product_code),
            resource_type: Some("package".to_string()),
            resource_id: None,
            detail: Some("ProductCode must be a curly-braced GUID, e.g. {12345678-ABCD-1234-ABCD-123456789ABC}".to_string()),
        });
    }

    if !is_valid_guid(&pkg.upgrade_code) {
        diagnostics.push(BuildDiagnostic {
            code: "PKG004".to_string(),
            severity: "error".to_string(),
            message: format!("UpgradeCode '{}' is not a valid GUID", pkg.upgrade_code),
            resource_type: Some("package".to_string()),
            resource_id: None,
            detail: Some("UpgradeCode must be a curly-braced GUID, e.g. {12345678-ABCD-1234-ABCD-123456789ABC}".to_string()),
        });
    }

    if pkg.product_code.to_uppercase() == pkg.upgrade_code.to_uppercase() {
        diagnostics.push(BuildDiagnostic {
            code: "UPG001".to_string(),
            severity: "error".to_string(),
            message: "ProductCode and UpgradeCode must be distinct GUIDs".to_string(),
            resource_type: Some("package".to_string()),
            resource_id: None,
            detail: Some("UpgradeCode identifies the product family across upgrades, whereas ProductCode identifies this specific release.".to_string()),
        });
    }

    if pkg.manufacturer.trim().is_empty() {
        diagnostics.push(BuildDiagnostic {
            code: "PKG005".to_string(),
            severity: "warning".to_string(),
            message: "Manufacturer is empty".to_string(),
            resource_type: Some("package".to_string()),
            resource_id: None,
            detail: Some("Specifying a manufacturer ensures standard Add/Remove Programs display in Windows.".to_string()),
        });
    }

    if pkg.install_subdirectory.trim().is_empty() {
        diagnostics.push(BuildDiagnostic {
            code: "PKG006".to_string(),
            severity: "error".to_string(),
            message: "Installation subdirectory cannot be empty".to_string(),
            resource_type: Some("package".to_string()),
            resource_id: None,
            detail: Some("Specify an application folder name (e.g. 'MyApp').".to_string()),
        });
    } else if pkg.install_subdirectory.contains('/') || pkg.install_subdirectory.contains('\\') || pkg.install_subdirectory.contains(':') {
        diagnostics.push(BuildDiagnostic {
            code: "PKG006".to_string(),
            severity: "error".to_string(),
            message: "Installation subdirectory contains invalid path separators".to_string(),
            resource_type: Some("package".to_string()),
            resource_id: None,
            detail: Some("Installation subdirectory must be a single directory name without slashes or colons.".to_string()),
        });
    }
}

pub fn is_valid_guid(s: &str) -> bool {
    let trimmed = s.trim();
    if !trimmed.starts_with('{') || !trimmed.ends_with('}') {
        return false;
    }
    let inner = &trimmed[1..trimmed.len() - 1];
    Uuid::parse_str(inner).is_ok()
}

pub fn is_valid_msi_version(s: &str) -> bool {
    let parts: Vec<&str> = s.trim().split('.').collect();
    if parts.is_empty() || parts.len() > 4 {
        return false;
    }
    if let Ok(major) = parts[0].parse::<u32>() {
        if major > 255 {
            return false;
        }
    } else {
        return false;
    }
    if parts.len() > 1 {
        if let Ok(minor) = parts[1].parse::<u32>() {
            if minor > 255 {
                return false;
            }
        } else {
            return false;
        }
    }
    if parts.len() > 2 {
        if let Ok(build) = parts[2].parse::<u32>() {
            if build > 65535 {
                return false;
            }
        } else {
            return false;
        }
    }
    if parts.len() > 3 {
        if let Ok(rev) = parts[3].parse::<u32>() {
            if rev > 65535 {
                return false;
            }
        } else {
            return false;
        }
    }
    true
}
