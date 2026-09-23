pub mod cabinet;
pub mod directories;
pub mod ids;
pub mod properties;
pub mod registry;
pub mod sequences;
pub mod services;
pub mod tables;
pub mod upgrade;

use crate::error::MsiError;
use crate::model::{BuildMetadata, BuildResult, MsiBuilderProject};
use crate::storage::BuildFile;
use directories::build_directory_tree;
use ids::make_stable_id;
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::io::{Cursor, Read};
use velocity_msi::{MsiBuilder, Value};

pub fn resolve_sddl(preset: Option<&str>, custom_sddl: Option<&str>) -> Option<String> {
    if let Some(sddl) = custom_sddl {
        let trimmed = sddl.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }
    match preset {
        Some("shared_all") => Some("D:(A;OICI;GA;;;WD)(A;OICI;GA;;;BA)(A;OICI;GA;;;SY)".to_string()),
        Some("admin_only") => Some("D:P(A;OICI;GA;;;BA)(A;OICI;GA;;;SY)".to_string()),
        Some("readonly_users") => Some("D:(A;OICI;GRGX;;;BU)(A;OICI;GA;;;BA)(A;OICI;GA;;;SY)".to_string()),
        Some("service_user_control") => Some("D:(A;;CCLCSWRPWPDTLORC;;;AU)(A;;CCDCLCSWRPWPDTLOSDRCWDWO;;;BA)(A;;CCLCSWRPWPDTLORC;;;SY)".to_string()),
        _ => None,
    }
}

pub fn generate_msi<W, F, R>(
    mut writer: W,
    project: &MsiBuilderProject,
    open_file: F,
) -> Result<(W, BuildResult), MsiError>
where
    W: BuildFile,
    F: FnMut(&str) -> Result<R, MsiError>,
    R: Read,
{
    let is_64bit = project.package.architecture_id.to_lowercase() == "amd64";
    let component_attr = if is_64bit { 256 } else { 0 };

    // Determine special directory requirements
    let need_start_menu = project.shortcuts.iter().any(|s| s.location == "startMenu");
    let need_desktop = project.shortcuts.iter().any(|s| s.location == "desktop");
    let start_menu_sub = project
        .shortcuts
        .iter()
        .find_map(|s| s.start_menu_subdirectory.as_deref());

    let mut dest_dirs: Vec<String> = project
        .files
        .iter()
        .map(|f| f.destination_directory.clone())
        .collect();
    for fld in &project.folders {
        dest_dirs.push(fld.path.clone());
    }

    // 1. Build directory tree
    let dir_tree = build_directory_tree(
        &project.package.architecture_id,
        &project.package.install_context,
        &project.package.install_root,
        &project.package.manufacturer,
        &project.package.install_subdirectory,
        &dest_dirs,
        need_start_menu,
        start_menu_sub,
        need_desktop,
    );

    // 2. Prepare normalized files and components
    struct PreparedFile {
        file_id: String,
        component_id: String,
        component_guid: String,
        directory_id: String,
        destination_name: String,
        size: u64,
        sequence: i32,
        source_ref: String,
    }

    let mut prepared_files = Vec::new();
    let mut file_id_map = HashMap::new();
    let mut file_to_component = HashMap::new();

    for (i, f) in project.files.iter().enumerate() {
        let seq = (i + 1) as i32;
        let internal_file_id = make_stable_id("fil", &format!("{}_{}", f.destination_name, seq), 72);
        let internal_comp_id = make_stable_id("cmp", &format!("{}_{}", f.destination_name, seq), 72);

        let clean_dest_dir = f.destination_directory.trim_matches(['/', '\\']).replace('\\', "/");
        let dir_id = dir_tree
            .dir_map
            .get(&clean_dest_dir)
            .cloned()
            .unwrap_or_else(|| dir_tree.install_dir_id.clone());

        file_id_map.insert(f.id.clone(), internal_file_id.clone());
        file_to_component.insert(f.id.clone(), internal_comp_id.clone());

        prepared_files.push(PreparedFile {
            file_id: internal_file_id,
            component_id: internal_comp_id,
            component_guid: f.component_guid.clone(),
            directory_id: dir_id,
            destination_name: f.destination_name.clone(),
            size: f.size,
            sequence: seq,
            source_ref: f.source_ref.clone(),
        });
    }

    // 3. Build embedded MSZIP cabinet
    let cab_entries: Vec<cabinet::CabinetFileEntry> = prepared_files
        .iter()
        .map(|pf| cabinet::CabinetFileEntry {
            file_id: pf.file_id.clone(),
            source_ref: pf.source_ref.clone(),
        })
        .collect();

    let cab_buffer = Cursor::new(Vec::new());
    let finished_cab = cabinet::build_cabinet(cab_buffer, &cab_entries, open_file)?;
    let cab_bytes = finished_cab.into_inner();

    // 4. Initialize MsiBuilder
    let mut builder = MsiBuilder::new();
    builder.set_title(&project.package.product_name);
    builder.set_author(&project.package.manufacturer);
    builder.set_subject(&project.package.product_name);
    if let Some(ref d) = project.package.description {
        builder.set_comments(d);
    }
    builder.set_template(
        if is_64bit { "x64" } else { "Intel" },
        project.package.language,
    );

    // 5. Create tables
    builder.create_table("Property", tables::property_columns())
        .map_err(|e| MsiError::Msi(format!("Property table: {}", e)))?;
    builder.create_table("Directory", tables::directory_columns())
        .map_err(|e| MsiError::Msi(format!("Directory table: {}", e)))?;
    builder.create_table("Feature", tables::feature_columns())
        .map_err(|e| MsiError::Msi(format!("Feature table: {}", e)))?;
    builder.create_table("Component", tables::component_columns())
        .map_err(|e| MsiError::Msi(format!("Component table: {}", e)))?;
    builder.create_table("FeatureComponents", tables::feature_components_columns())
        .map_err(|e| MsiError::Msi(format!("FeatureComponents table: {}", e)))?;
    builder.create_table("File", tables::file_columns())
        .map_err(|e| MsiError::Msi(format!("File table: {}", e)))?;
    builder.create_table("Media", tables::media_columns())
        .map_err(|e| MsiError::Msi(format!("Media table: {}", e)))?;
    builder.create_table("InstallExecuteSequence", tables::sequence_columns())
        .map_err(|e| MsiError::Msi(format!("InstallExecuteSequence table: {}", e)))?;
    builder.create_table("InstallUISequence", tables::sequence_columns())
        .map_err(|e| MsiError::Msi(format!("InstallUISequence table: {}", e)))?;
    builder.create_table("AdminExecuteSequence", tables::sequence_columns())
        .map_err(|e| MsiError::Msi(format!("AdminExecuteSequence table: {}", e)))?;
    builder.create_table("AdminUISequence", tables::sequence_columns())
        .map_err(|e| MsiError::Msi(format!("AdminUISequence table: {}", e)))?;
    builder.create_table("AdvtExecuteSequence", tables::sequence_columns())
        .map_err(|e| MsiError::Msi(format!("AdvtExecuteSequence table: {}", e)))?;
    builder.create_table("Upgrade", tables::upgrade_columns())
        .map_err(|e| MsiError::Msi(format!("Upgrade table: {}", e)))?;
    builder.create_table("LaunchCondition", tables::launch_condition_columns())
        .map_err(|e| MsiError::Msi(format!("LaunchCondition table: {}", e)))?;

    let has_shortcuts = !project.shortcuts.is_empty();
    if has_shortcuts {
        builder.create_table("Shortcut", tables::shortcut_columns())
            .map_err(|e| MsiError::Msi(format!("Shortcut table: {}", e)))?;
    }

    let has_registry = !project.registry.is_empty();
    if has_registry {
        builder.create_table("Registry", tables::registry_columns())
            .map_err(|e| MsiError::Msi(format!("Registry table: {}", e)))?;
    }

    let has_services = !project.services.is_empty();
    if has_services {
        builder.create_table("ServiceInstall", tables::service_install_columns())
            .map_err(|e| MsiError::Msi(format!("ServiceInstall table: {}", e)))?;
        builder.create_table("ServiceControl", tables::service_control_columns())
            .map_err(|e| MsiError::Msi(format!("ServiceControl table: {}", e)))?;
    }

    let has_root_folder_acl = resolve_sddl(
        project.package.permission_preset.as_deref(),
        project.package.permission_sddl.as_deref(),
    ).is_some();

    let has_create_folder = has_root_folder_acl || !project.folders.is_empty();

    let has_lock_permissions = has_root_folder_acl
        || project.folders.iter().any(|f| resolve_sddl(f.permission_preset.as_deref(), f.permission_sddl.as_deref()).is_some())
        || project.files.iter().any(|f| resolve_sddl(f.permission_preset.as_deref(), f.permission_sddl.as_deref()).is_some())
        || project.registry.iter().any(|r| resolve_sddl(r.permission_preset.as_deref(), r.permission_sddl.as_deref()).is_some())
        || project.services.iter().any(|s| resolve_sddl(s.permission_preset.as_deref(), s.permission_sddl.as_deref()).is_some());

    if has_create_folder {
        builder.create_table("CreateFolder", tables::create_folder_columns())
            .map_err(|e| MsiError::Msi(format!("CreateFolder table: {}", e)))?;
    }

    if has_lock_permissions {
        builder.create_table("MsiLockPermissionsEx", tables::msi_lock_permissions_ex_columns())
            .map_err(|e| MsiError::Msi(format!("MsiLockPermissionsEx table: {}", e)))?;
    }

    let mut create_folder_rows = Vec::new();
    let mut lock_perm_rows = Vec::new();

    if let Some(sddl) = resolve_sddl(
        project.package.permission_preset.as_deref(),
        project.package.permission_sddl.as_deref(),
    ) {
        let first_comp_id = prepared_files
            .first()
            .map(|pf| pf.component_id.clone())
            .or_else(|| project.folders.first().map(|f| {
                f.component_id.clone().unwrap_or_else(|| make_stable_id("cmp_fld", &f.id, 72))
            }))
            .unwrap_or_else(|| "cmp_installdir".to_string());
        create_folder_rows.push(vec![
            Value::from(dir_tree.install_dir_id.clone()),
            Value::from(first_comp_id),
        ]);
        lock_perm_rows.push(vec![
            Value::from(dir_tree.install_dir_id.clone()),
            Value::from("CreateFolder"),
            Value::from(sddl),
            Value::Null,
        ]);
    }

    for (f, pf) in project.files.iter().zip(prepared_files.iter()) {
        if let Some(sddl) = resolve_sddl(f.permission_preset.as_deref(), f.permission_sddl.as_deref()) {
            lock_perm_rows.push(vec![
                Value::from(pf.file_id.clone()),
                Value::from("File"),
                Value::from(sddl),
                Value::Null,
            ]);
        }
    }

    // 6. Insert Properties
    let props = properties::build_properties(project);
    let prop_rows: Vec<Vec<Value>> = props
        .into_iter()
        .map(|p| vec![Value::from(p.name), Value::from(p.value)])
        .collect();
    builder.insert_rows("Property", prop_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting properties: {}", e)))?;

    // 7. Insert Directories
    let dir_rows: Vec<Vec<Value>> = dir_tree
        .rows
        .iter()
        .map(|d| {
            vec![
                Value::from(d.directory.clone()),
                match &d.parent {
                    Some(p) => Value::from(p.clone()),
                    None => Value::Null,
                },
                Value::from(d.default_dir.clone()),
            ]
        })
        .collect();
    builder.insert_rows("Directory", dir_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting directories: {}", e)))?;

    // 8. Insert Feature
    let feature_id = "MainFeature".to_string();
    let feat_rows = vec![vec![
        Value::from(feature_id.clone()),
        Value::Null,
        Value::from(project.package.product_name.clone()),
        Value::from("Complete feature installation"),
        Value::from(1i32),
        Value::from(1i32),
        Value::from(dir_tree.install_dir_id.clone()),
        Value::from(0i32),
    ]];
    builder.insert_rows("Feature", feat_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting feature: {}", e)))?;

    // 9. Insert Components & FeatureComponents
    let mut all_component_ids = HashSet::new();
    let mut comp_rows = Vec::new();
    let mut feat_comp_rows = Vec::new();

    for pf in &prepared_files {
        all_component_ids.insert(pf.component_id.clone());
        comp_rows.push(vec![
            Value::from(pf.component_id.clone()),
            Value::from(pf.component_guid.clone()),
            Value::from(pf.directory_id.clone()),
            Value::from(component_attr as i32),
            Value::Null,
            Value::from(pf.file_id.clone()),
        ]);

        feat_comp_rows.push(vec![
            Value::from(feature_id.clone()),
            Value::from(pf.component_id.clone()),
        ]);
    }

    let mut reg_components = HashMap::new();
    for (idx, reg) in project.registry.iter().enumerate() {
        if reg.owner_file_id.is_none() {
            let reg_comp_id = make_stable_id("cmp_reg", &format!("{}_{}", reg.id, idx + 1), 72);
            let reg_guid = reg.component_guid.clone().unwrap_or_else(|| {
                format!("{{{}}}", uuid::Uuid::new_v4().hyphenated().to_string().to_uppercase())
            });
            let reg_key_id = make_stable_id("reg", &format!("{}_{}", reg.id, idx + 1), 72);

            comp_rows.push(vec![
                Value::from(reg_comp_id.clone()),
                Value::from(reg_guid),
                Value::from(dir_tree.install_dir_id.clone()),
                Value::from(component_attr as i32),
                Value::Null,
                Value::from(reg_key_id.clone()),
            ]);

            feat_comp_rows.push(vec![
                Value::from(feature_id.clone()),
                Value::from(reg_comp_id.clone()),
            ]);

            reg_components.insert(reg.id.clone(), (reg_comp_id, reg_key_id));
        }
    }

    for (idx, fld) in project.folders.iter().enumerate() {
        let clean = fld.path.trim_matches(['/', '\\']).replace('\\', "/");
        let folder_dir_id = dir_tree
            .dir_map
            .get(&clean)
            .cloned()
            .unwrap_or_else(|| dir_tree.install_dir_id.clone());
        let comp_id = fld.component_id.clone().unwrap_or_else(|| {
            make_stable_id("cmp_fld", &format!("{}_{}", fld.id, idx + 1), 72)
        });
        let comp_guid = fld.component_guid.clone().unwrap_or_else(|| {
            format!("{{{}}}", uuid::Uuid::new_v4().hyphenated().to_string().to_uppercase())
        });

        comp_rows.push(vec![
            Value::from(comp_id.clone()),
            Value::from(comp_guid),
            Value::from(folder_dir_id.clone()),
            Value::from(component_attr as i32),
            Value::Null,
            Value::Null, // Null KeyPath means Directory_ is the KeyPath per MSI spec
        ]);

        feat_comp_rows.push(vec![
            Value::from(feature_id.clone()),
            Value::from(comp_id.clone()),
        ]);

        create_folder_rows.push(vec![
            Value::from(folder_dir_id.clone()),
            Value::from(comp_id.clone()),
        ]);

        if let Some(sddl) = resolve_sddl(fld.permission_preset.as_deref(), fld.permission_sddl.as_deref()) {
            lock_perm_rows.push(vec![
                Value::from(folder_dir_id.clone()),
                Value::from("CreateFolder"),
                Value::from(sddl),
                Value::Null,
            ]);
        }
    }

    if prepared_files.is_empty() && project.folders.is_empty() && has_root_folder_acl {
        let root_comp_id = "cmp_installdir".to_string();
        let root_guid = format!("{{{}}}", uuid::Uuid::new_v4().hyphenated().to_string().to_uppercase());
        comp_rows.push(vec![
            Value::from(root_comp_id.clone()),
            Value::from(root_guid),
            Value::from(dir_tree.install_dir_id.clone()),
            Value::from(component_attr as i32),
            Value::Null,
            Value::Null,
        ]);
        feat_comp_rows.push(vec![
            Value::from(feature_id.clone()),
            Value::from(root_comp_id),
        ]);
    }

    builder.insert_rows("Component", comp_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting components: {}", e)))?;
    builder.insert_rows("FeatureComponents", feat_comp_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting feature components: {}", e)))?;

    // 10. Insert Files
    let file_rows: Vec<Vec<Value>> = prepared_files
        .iter()
        .map(|pf| {
            vec![
                Value::from(pf.file_id.clone()),
                Value::from(pf.component_id.clone()),
                Value::from(pf.destination_name.clone()),
                Value::from(pf.size as i32),
                Value::Null,
                Value::Null,
                Value::from(512i32), // msidbFileAttributesCompressed
                Value::from(pf.sequence),
            ]
        })
        .collect();
    builder.insert_rows("File", file_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting files: {}", e)))?;

    // 11. Insert Media
    let media_rows = vec![vec![
        Value::from(1i32),
        Value::from(prepared_files.len() as i32),
        Value::Null,
        Value::from("#cab1.cab"),
        Value::Null,
        Value::Null,
    ]];
    builder.insert_rows("Media", media_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting media: {}", e)))?;

    // 12. Insert Shortcuts if present
    if has_shortcuts {
        let mut sct_rows = Vec::new();
        for (i, sct) in project.shortcuts.iter().enumerate() {
            let sct_id = make_stable_id("sct", &format!("{}_{}", sct.name, i + 1), 72);
            let sct_dir = if sct.location == "desktop" {
                dir_tree.desktop_dir_id.clone().unwrap_or_else(|| "DesktopFolder".to_string())
            } else {
                dir_tree.start_menu_dir_id.clone().unwrap_or_else(|| "ProgramMenuFolder".to_string())
            };

            let internal_target_file = file_id_map
                .get(&sct.target_file_id)
                .cloned()
                .unwrap_or_else(|| sct.target_file_id.clone());
            let target_ref = format!("[#{}]", internal_target_file);

            let comp_id = file_to_component
                .get(&sct.target_file_id)
                .cloned()
                .unwrap_or_else(|| prepared_files[0].component_id.clone());

            let show_cmd: i32 = match sct.show.as_str() {
                "minimized" => 7,
                "maximized" => 3,
                _ => 1,
            };

            sct_rows.push(vec![
                Value::from(sct_id),
                Value::from(sct_dir),
                Value::from(sct.name.clone()),
                Value::from(comp_id),
                Value::from(target_ref),
                match &sct.arguments {
                    Some(a) => Value::from(a.clone()),
                    None => Value::Null,
                },
                match &sct.description {
                    Some(d) => Value::from(d.clone()),
                    None => Value::Null,
                },
                Value::Null,
                Value::Null,
                Value::Null,
                Value::from(show_cmd),
                Value::from(dir_tree.install_dir_id.clone()),
            ]);
        }
        builder.insert_rows("Shortcut", sct_rows)
            .map_err(|e| MsiError::Msi(format!("Inserting shortcuts: {}", e)))?;
    }

    // 13. Insert Registry if present
    if has_registry {
        let mut reg_rows = Vec::new();
        for (i, reg) in project.registry.iter().enumerate() {
            let (reg_id, comp_id) = if let Some(ref owner_file) = reg.owner_file_id {
                let cid = file_to_component
                    .get(owner_file)
                    .cloned()
                    .unwrap_or_else(|| prepared_files[0].component_id.clone());
                (make_stable_id("reg", &format!("{}_{}", reg.id, i + 1), 72), cid)
            } else if let Some((cid, rid)) = reg_components.get(&reg.id) {
                (rid.clone(), cid.clone())
            } else {
                let cid = prepared_files[0].component_id.clone();
                (make_stable_id("reg", &format!("{}_{}", reg.id, i + 1), 72), cid)
            };

            let root_num = registry::hive_to_root(&reg.hive)?;
            let encoded_val = registry::encode_registry_value(reg)?;

            reg_rows.push(vec![
                Value::from(reg_id.clone()),
                Value::from(root_num),
                Value::from(reg.key.clone()),
                match &reg.name {
                    Some(n) if !n.is_empty() => Value::from(n.clone()),
                    _ => Value::Null,
                },
                Value::from(encoded_val),
                Value::from(comp_id),
            ]);

            if let Some(sddl) = resolve_sddl(reg.permission_preset.as_deref(), reg.permission_sddl.as_deref()) {
                lock_perm_rows.push(vec![
                    Value::from(reg_id),
                    Value::from("Registry"),
                    Value::from(sddl),
                    Value::Null,
                ]);
            }
        }
        builder.insert_rows("Registry", reg_rows)
            .map_err(|e| MsiError::Msi(format!("Inserting registry: {}", e)))?;
    }

    // 14. Insert Services if present
    if has_services {
        let mut svc_ins_rows = Vec::new();
        let mut svc_ctl_rows = Vec::new();

        for (i, svc) in project.services.iter().enumerate() {
            let svc_install_id = make_stable_id("svc_ins", &format!("{}_{}", svc.name, i + 1), 72);
            let svc_control_id = make_stable_id("svc_ctl", &format!("{}_{}", svc.name, i + 1), 72);

            let comp_id = file_to_component
                .get(&svc.executable_file_id)
                .cloned()
                .ok_or_else(|| MsiError::Config(format!("Service '{}' executable file not mapped to a component", svc.name)))?;

            let svc_type = services::service_type_to_int(svc);
            let start_type = services::start_type_to_int(&svc.start_type);
            let err_control = services::error_control_to_int(&svc.error_control);
            let acct = services::normalize_account_name(&svc.account);
            let deps = if svc.dependencies.is_empty() {
                None
            } else {
                Some(svc.dependencies.join("[~]"))
            };

            svc_ins_rows.push(vec![
                Value::from(svc_install_id.clone()),
                Value::from(svc.name.clone()),
                match &svc.display_name {
                    Some(dn) if !dn.is_empty() => Value::from(dn.clone()),
                    _ => Value::from(svc.name.clone()),
                },
                Value::from(svc_type),
                Value::from(start_type),
                Value::from(err_control),
                Value::Null,
                match deps {
                    Some(d) => Value::from(d),
                    None => Value::Null,
                },
                Value::from(acct),
                Value::Null,
                match &svc.arguments {
                    Some(a) if !a.is_empty() => Value::from(a.clone()),
                    _ => Value::Null,
                },
                Value::from(comp_id.clone()),
                match &svc.description {
                    Some(d) => Value::from(d.clone()),
                    None => Value::Null,
                },
            ]);

            let event_bitmask = services::service_control_event_bitmask(svc);
            let wait_val: i32 = if svc.wait { 1 } else { 0 };

            svc_ctl_rows.push(vec![
                Value::from(svc_control_id),
                Value::from(svc.name.clone()),
                Value::from(event_bitmask),
                Value::Null,
                Value::from(wait_val),
                Value::from(comp_id),
            ]);

            if let Some(sddl) = resolve_sddl(svc.permission_preset.as_deref(), svc.permission_sddl.as_deref()) {
                lock_perm_rows.push(vec![
                    Value::from(svc_install_id),
                    Value::from("ServiceInstall"),
                    Value::from(sddl),
                    Value::Null,
                ]);
            }
        }

        builder.insert_rows("ServiceInstall", svc_ins_rows)
            .map_err(|e| MsiError::Msi(format!("Inserting ServiceInstall: {}", e)))?;
        builder.insert_rows("ServiceControl", svc_ctl_rows)
            .map_err(|e| MsiError::Msi(format!("Inserting ServiceControl: {}", e)))?;
    }

    // 14b. Insert CreateFolder and MsiLockPermissionsEx if present
    if has_create_folder && !create_folder_rows.is_empty() {
        builder.insert_rows("CreateFolder", create_folder_rows)
            .map_err(|e| MsiError::Msi(format!("Inserting CreateFolder: {}", e)))?;
    }
    if has_lock_permissions && !lock_perm_rows.is_empty() {
        builder.insert_rows("MsiLockPermissionsEx", lock_perm_rows)
            .map_err(|e| MsiError::Msi(format!("Inserting MsiLockPermissionsEx: {}", e)))?;
    }

    // 15. Insert Upgrade rows
    let upg_rows: Vec<Vec<Value>> = upgrade::build_upgrade_rows(project)
        .into_iter()
        .map(|u| {
            vec![
                Value::from(u.upgrade_code),
                match u.version_min {
                    Some(v) => Value::from(v),
                    None => Value::Null,
                },
                match u.version_max {
                    Some(v) => Value::from(v),
                    None => Value::Null,
                },
                match u.language {
                    Some(l) => Value::from(l),
                    None => Value::Null,
                },
                Value::from(u.attributes),
                match u.remove {
                    Some(r) => Value::from(r),
                    None => Value::Null,
                },
                Value::from(u.action_property),
            ]
        })
        .collect();
    builder.insert_rows("Upgrade", upg_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting upgrade rows: {}", e)))?;

    let launch_cond_rows = vec![vec![
        Value::from("NOT NEWERVERSIONDETECTED"),
        Value::from("A newer version of [ProductName] is already installed."),
    ]];
    builder.insert_rows("LaunchCondition", launch_cond_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting LaunchCondition: {}", e)))?;

    // 16. Insert Sequences
    let inst_seq_rows: Vec<Vec<Value>> = sequences::build_install_execute_sequence(
        has_services,
        has_shortcuts,
        has_registry,
        has_create_folder,
    )
        .into_iter()
        .map(|s| {
            vec![
                Value::from(s.action),
                match s.condition {
                    Some(c) => Value::from(c),
                    None => Value::Null,
                },
                Value::from(s.sequence),
            ]
        })
        .collect();
    builder.insert_rows("InstallExecuteSequence", inst_seq_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting InstallExecuteSequence: {}", e)))?;

    let admin_seq_rows: Vec<Vec<Value>> = sequences::build_admin_execute_sequence()
        .into_iter()
        .map(|s| {
            vec![
                Value::from(s.action),
                match s.condition {
                    Some(c) => Value::from(c),
                    None => Value::Null,
                },
                Value::from(s.sequence),
            ]
        })
        .collect();
    builder.insert_rows("AdminExecuteSequence", admin_seq_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting AdminExecuteSequence: {}", e)))?;

    let advt_seq_rows: Vec<Vec<Value>> = sequences::build_advt_execute_sequence()
        .into_iter()
        .map(|s| {
            vec![
                Value::from(s.action),
                match s.condition {
                    Some(c) => Value::from(c),
                    None => Value::Null,
                },
                Value::from(s.sequence),
            ]
        })
        .collect();
    builder.insert_rows("AdvtExecuteSequence", advt_seq_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting AdvtExecuteSequence: {}", e)))?;

    let ui_seq_rows: Vec<Vec<Value>> = sequences::build_install_ui_sequence()
        .into_iter()
        .map(|s| {
            vec![
                Value::from(s.action),
                match s.condition {
                    Some(c) => Value::from(c),
                    None => Value::Null,
                },
                Value::from(s.sequence),
            ]
        })
        .collect();
    builder.insert_rows("InstallUISequence", ui_seq_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting InstallUISequence: {}", e)))?;

    let admin_ui_seq_rows: Vec<Vec<Value>> = sequences::build_admin_ui_sequence()
        .into_iter()
        .map(|s| {
            vec![
                Value::from(s.action),
                match s.condition {
                    Some(c) => Value::from(c),
                    None => Value::Null,
                },
                Value::from(s.sequence),
            ]
        })
        .collect();
    builder.insert_rows("AdminUISequence", admin_ui_seq_rows)
        .map_err(|e| MsiError::Msi(format!("Inserting AdminUISequence: {}", e)))?;

    // 17. Embed cabinet stream
    builder.add_stream("cab1.cab".to_string(), cab_bytes);

    // 18. Build complete MSI binary
    let msi_bytes = builder.build()
        .map_err(|e| MsiError::Msi(format!("Failed building MSI: {}", e)))?;

    // 19. Stream MSI bytes into BuildFile writer
    writer.write_all(&msi_bytes)
        .map_err(MsiError::Io)?;
    writer.flush_build()
        .map_err(|e| MsiError::Storage(format!("Failed flushing build file: {}", e)))?;

    // 20. Calculate SHA-256
    let mut hasher = Sha256::new();
    hasher.update(&msi_bytes);
    let sha256_hex = hex::encode(hasher.finalize());

    let default_file_name = format!(
        "{}-{}-{}.msi",
        ids::sanitize_identifier(&project.package.product_name, 32),
        project.package.version,
        if is_64bit { "x64" } else { "x86" }
    );
    let output_name = project
        .package
        .output_file_name
        .clone()
        .unwrap_or(default_file_name);

    let result = BuildResult {
        file_name: output_name,
        size: msi_bytes.len() as u64,
        sha256: sha256_hex,
        metadata: BuildMetadata {
            product_code: project.package.product_code.clone(),
            upgrade_code: project.package.upgrade_code.clone(),
            file_count: project.files.len(),
            component_count: all_component_ids.len() + reg_components.len(),
            shortcut_count: project.shortcuts.len(),
            registry_count: project.registry.len(),
            service_count: project.services.len(),
        },
    };

    Ok((writer, result))
}
