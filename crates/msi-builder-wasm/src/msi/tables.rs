use velocity_msi::Column;

pub fn property_columns() -> Vec<Column> {
    vec![
        Column::build("Property").string(72).primary_key().build(),
        Column::build("Value").string(255).nullable().localizable().build(),
    ]
}

pub fn directory_columns() -> Vec<Column> {
    vec![
        Column::build("Directory").string(72).primary_key().build(),
        Column::build("Directory_Parent").string(72).nullable().build(),
        Column::build("DefaultDir").string(255).build(),
    ]
}

pub fn feature_columns() -> Vec<Column> {
    vec![
        Column::build("Feature").string(38).primary_key().build(),
        Column::build("Feature_Parent").string(38).nullable().build(),
        Column::build("Title").string(64).nullable().localizable().build(),
        Column::build("Description").string(255).nullable().localizable().build(),
        Column::build("Display").int16().nullable().build(),
        Column::build("Level").int16().build(),
        Column::build("Directory_").string(72).nullable().build(),
        Column::build("Attributes").int16().build(),
    ]
}

pub fn component_columns() -> Vec<Column> {
    vec![
        Column::build("Component").string(72).primary_key().build(),
        Column::build("ComponentId").string(38).nullable().build(),
        Column::build("Directory_").string(72).build(),
        Column::build("Attributes").int16().build(),
        Column::build("Condition").string(255).nullable().build(),
        Column::build("KeyPath").string(72).nullable().build(),
    ]
}

pub fn feature_components_columns() -> Vec<Column> {
    vec![
        Column::build("Feature_").string(38).primary_key().build(),
        Column::build("Component_").string(72).primary_key().build(),
    ]
}

pub fn file_columns() -> Vec<Column> {
    vec![
        Column::build("File").string(72).primary_key().build(),
        Column::build("Component_").string(72).build(),
        Column::build("FileName").string(255).build(),
        Column::build("FileSize").int32().build(),
        Column::build("Version").string(72).nullable().build(),
        Column::build("Language").string(20).nullable().build(),
        Column::build("Attributes").int16().nullable().build(),
        Column::build("Sequence").int32().build(),
    ]
}

pub fn media_columns() -> Vec<Column> {
    vec![
        Column::build("DiskId").int16().primary_key().build(),
        Column::build("LastSequence").int32().build(),
        Column::build("DiskPrompt").string(64).nullable().build(),
        Column::build("Cabinet").string(255).nullable().build(),
        Column::build("VolumeLabel").string(32).nullable().build(),
        Column::build("Source").string(72).nullable().build(),
    ]
}

pub fn sequence_columns() -> Vec<Column> {
    vec![
        Column::build("Action").string(72).primary_key().build(),
        Column::build("Condition").string(255).nullable().build(),
        Column::build("Sequence").int16().nullable().build(),
    ]
}

pub fn shortcut_columns() -> Vec<Column> {
    vec![
        Column::build("Shortcut").string(72).primary_key().build(),
        Column::build("Directory_").string(72).build(),
        Column::build("Name").string(255).build(),
        Column::build("Component_").string(72).build(),
        Column::build("Target").string(72).build(),
        Column::build("Arguments").string(255).nullable().build(),
        Column::build("Description").string(255).nullable().build(),
        Column::build("Hotkey").int16().nullable().build(),
        Column::build("Icon_").string(72).nullable().build(),
        Column::build("IconIndex").int16().nullable().build(),
        Column::build("ShowCmd").int16().nullable().build(),
        Column::build("WkDir").string(72).nullable().build(),
    ]
}

pub fn registry_columns() -> Vec<Column> {
    vec![
        Column::build("Registry").string(72).primary_key().build(),
        Column::build("Root").int16().build(),
        Column::build("Key").string(255).build(),
        Column::build("Name").string(255).nullable().build(),
        Column::build("Value").string(0).nullable().build(),
        Column::build("Component_").string(72).build(),
    ]
}

pub fn service_install_columns() -> Vec<Column> {
    vec![
        Column::build("ServiceInstall").string(72).primary_key().build(),
        Column::build("Name").string(255).build(),
        Column::build("DisplayName").string(255).nullable().build(),
        Column::build("ServiceType").int32().build(),
        Column::build("StartType").int32().build(),
        Column::build("ErrorControl").int32().build(),
        Column::build("LoadOrderGroup").string(255).nullable().build(),
        Column::build("Dependencies").string(255).nullable().build(),
        Column::build("StartName").string(255).nullable().build(),
        Column::build("Password").string(255).nullable().build(),
        Column::build("Arguments").string(255).nullable().build(),
        Column::build("Component_").string(72).build(),
        Column::build("Description").string(255).nullable().build(),
    ]
}

pub fn service_control_columns() -> Vec<Column> {
    vec![
        Column::build("ServiceControl").string(72).primary_key().build(),
        Column::build("Name").string(255).build(),
        Column::build("Event").int16().build(),
        Column::build("Arguments").string(255).nullable().build(),
        Column::build("Wait").int16().nullable().build(),
        Column::build("Component_").string(72).build(),
    ]
}

pub fn upgrade_columns() -> Vec<Column> {
    vec![
        Column::build("UpgradeCode").string(38).primary_key().build(),
        Column::build("VersionMin").string(20).nullable().primary_key().build(),
        Column::build("VersionMax").string(20).nullable().primary_key().build(),
        Column::build("Language").string(255).nullable().primary_key().build(),
        Column::build("Attributes").int32().primary_key().build(),
        Column::build("Remove").string(255).nullable().build(),
        Column::build("ActionProperty").string(72).primary_key().build(),
    ]
}

pub fn launch_condition_columns() -> Vec<Column> {
    vec![
        Column::build("Condition").string(255).primary_key().build(),
        Column::build("Description").string(255).localizable().build(),
    ]
}

pub fn create_folder_columns() -> Vec<Column> {
    vec![
        Column::build("Directory_").string(72).primary_key().build(),
        Column::build("Component_").string(72).primary_key().build(),
    ]
}

pub fn msi_lock_permissions_ex_columns() -> Vec<Column> {
    vec![
        Column::build("LockObject").string(72).primary_key().build(),
        Column::build("Table").string(32).primary_key().build(),
        Column::build("SDDLText").string(255).build(),
        Column::build("Condition").string(255).nullable().build(),
    ]
}

