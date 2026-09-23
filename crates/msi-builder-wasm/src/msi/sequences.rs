#[derive(Clone, Debug)]
pub struct SequenceRow {
    pub action: String,
    pub condition: Option<String>,
    pub sequence: i32,
}

pub fn build_install_execute_sequence(
    has_services: bool,
    has_shortcuts: bool,
    has_registry: bool,
    has_create_folder: bool,
) -> Vec<SequenceRow> {
    let mut seq = Vec::new();

    seq.push(SequenceRow { action: "FindRelatedProducts".into(), condition: None, sequence: 25 });
    seq.push(SequenceRow { action: "AppSearch".into(), condition: None, sequence: 50 });
    seq.push(SequenceRow { action: "LaunchConditions".into(), condition: None, sequence: 100 });
    seq.push(SequenceRow { action: "ValidateProductID".into(), condition: None, sequence: 700 });
    seq.push(SequenceRow { action: "CostInitialize".into(), condition: None, sequence: 800 });
    seq.push(SequenceRow { action: "FileCost".into(), condition: None, sequence: 900 });
    seq.push(SequenceRow { action: "CostFinalize".into(), condition: None, sequence: 1000 });
    seq.push(SequenceRow { action: "InstallValidate".into(), condition: None, sequence: 1400 });
    seq.push(SequenceRow { action: "RemoveExistingProducts".into(), condition: Some("UPGRADEFOUND".into()), sequence: 1450 });
    seq.push(SequenceRow { action: "InstallInitialize".into(), condition: None, sequence: 1500 });
    seq.push(SequenceRow { action: "ProcessComponents".into(), condition: None, sequence: 1600 });
    seq.push(SequenceRow { action: "UnpublishComponents".into(), condition: None, sequence: 1700 });
    seq.push(SequenceRow { action: "UnpublishFeatures".into(), condition: None, sequence: 1800 });

    if has_services {
        seq.push(SequenceRow { action: "StopServices".into(), condition: Some("VersionNT".into()), sequence: 1900 });
        seq.push(SequenceRow { action: "DeleteServices".into(), condition: Some("VersionNT".into()), sequence: 2000 });
    }

    if has_registry {
        seq.push(SequenceRow { action: "RemoveRegistryValues".into(), condition: None, sequence: 2600 });
    }

    if has_shortcuts {
        seq.push(SequenceRow { action: "RemoveShortcuts".into(), condition: None, sequence: 3200 });
    }

    seq.push(SequenceRow { action: "RemoveFiles".into(), condition: None, sequence: 3500 });

    if has_create_folder {
        seq.push(SequenceRow { action: "RemoveFolders".into(), condition: None, sequence: 3600 });
        seq.push(SequenceRow { action: "CreateFolders".into(), condition: None, sequence: 3700 });
    }

    seq.push(SequenceRow { action: "InstallFiles".into(), condition: None, sequence: 4200 });

    if has_shortcuts {
        seq.push(SequenceRow { action: "CreateShortcuts".into(), condition: None, sequence: 4500 });
    }

    if has_registry {
        seq.push(SequenceRow { action: "WriteRegistryValues".into(), condition: None, sequence: 5000 });
    }

    if has_services {
        seq.push(SequenceRow { action: "InstallServices".into(), condition: Some("VersionNT".into()), sequence: 5800 });
        seq.push(SequenceRow { action: "StartServices".into(), condition: Some("VersionNT".into()), sequence: 5900 });
    }

    seq.push(SequenceRow { action: "RegisterUser".into(), condition: None, sequence: 6000 });
    seq.push(SequenceRow { action: "RegisterProduct".into(), condition: None, sequence: 6100 });
    seq.push(SequenceRow { action: "PublishComponents".into(), condition: None, sequence: 6200 });
    seq.push(SequenceRow { action: "PublishFeatures".into(), condition: None, sequence: 6300 });
    seq.push(SequenceRow { action: "PublishProduct".into(), condition: None, sequence: 6400 });
    seq.push(SequenceRow { action: "InstallFinalize".into(), condition: None, sequence: 6600 });

    seq
}

pub fn build_admin_execute_sequence() -> Vec<SequenceRow> {
    vec![
        SequenceRow { action: "CostInitialize".into(), condition: None, sequence: 800 },
        SequenceRow { action: "FileCost".into(), condition: None, sequence: 900 },
        SequenceRow { action: "CostFinalize".into(), condition: None, sequence: 1000 },
        SequenceRow { action: "InstallValidate".into(), condition: None, sequence: 1400 },
        SequenceRow { action: "InstallInitialize".into(), condition: None, sequence: 1500 },
        SequenceRow { action: "InstallAdminPackage".into(), condition: None, sequence: 3900 },
        SequenceRow { action: "InstallFiles".into(), condition: None, sequence: 4000 },
        SequenceRow { action: "InstallFinalize".into(), condition: None, sequence: 6600 },
    ]
}

pub fn build_advt_execute_sequence() -> Vec<SequenceRow> {
    vec![
        SequenceRow { action: "CostInitialize".into(), condition: None, sequence: 800 },
        SequenceRow { action: "CostFinalize".into(), condition: None, sequence: 1000 },
        SequenceRow { action: "InstallValidate".into(), condition: None, sequence: 1400 },
        SequenceRow { action: "InstallInitialize".into(), condition: None, sequence: 1500 },
        SequenceRow { action: "PublishComponents".into(), condition: None, sequence: 6200 },
        SequenceRow { action: "PublishFeatures".into(), condition: None, sequence: 6300 },
        SequenceRow { action: "PublishProduct".into(), condition: None, sequence: 6400 },
        SequenceRow { action: "InstallFinalize".into(), condition: None, sequence: 6600 },
    ]
}

pub fn build_install_ui_sequence() -> Vec<SequenceRow> {
    vec![
        SequenceRow { action: "CostInitialize".into(), condition: None, sequence: 800 },
        SequenceRow { action: "FileCost".into(), condition: None, sequence: 900 },
        SequenceRow { action: "CostFinalize".into(), condition: None, sequence: 1000 },
        SequenceRow { action: "ExecuteAction".into(), condition: None, sequence: 1300 },
    ]
}

pub fn build_admin_ui_sequence() -> Vec<SequenceRow> {
    vec![
        SequenceRow { action: "CostInitialize".into(), condition: None, sequence: 800 },
        SequenceRow { action: "FileCost".into(), condition: None, sequence: 900 },
        SequenceRow { action: "CostFinalize".into(), condition: None, sequence: 1000 },
        SequenceRow { action: "ExecuteAction".into(), condition: None, sequence: 1300 },
    ]
}
