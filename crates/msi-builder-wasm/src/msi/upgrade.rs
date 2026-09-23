use crate::model::MsiBuilderProject;

#[derive(Clone, Debug)]
pub struct UpgradeRow {
    pub upgrade_code: String,
    pub version_min: Option<String>,
    pub version_max: Option<String>,
    pub language: Option<String>,
    pub attributes: i32,
    pub remove: Option<String>,
    pub action_property: String,
}

pub fn build_upgrade_rows(project: &MsiBuilderProject) -> Vec<UpgradeRow> {
    let pkg = &project.package;
    let mut rows = Vec::new();

    // Row 1: Detect and remove older versions (Major Upgrade)
    // Attributes: msidbUpgradeAttributesVersionMinInclusive (0x100 = 256)
    rows.push(UpgradeRow {
        upgrade_code: pkg.upgrade_code.clone(),
        version_min: None,
        version_max: Some(pkg.version.clone()),
        language: None,
        attributes: 0x100, // Detect everything up to current version
        remove: None,
        action_property: "UPGRADEFOUND".to_string(),
    });

    // Row 2: Downgrade prevention (detect newer version already installed)
    // Attributes: msidbUpgradeAttributesVersionMinInclusive (0x100 = 256) | msidbUpgradeAttributesOnlyDetect (0x004 = 4) = 260
    rows.push(UpgradeRow {
        upgrade_code: pkg.upgrade_code.clone(),
        version_min: Some(pkg.version.clone()),
        version_max: None,
        language: None,
        attributes: 0x104, // 260
        remove: None,
        action_property: "NEWERVERSIONDETECTED".to_string(),
    });

    rows
}
