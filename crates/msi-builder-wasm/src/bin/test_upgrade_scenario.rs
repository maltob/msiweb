use msi_builder_wasm::model::*;
use msi_builder_wasm::msi::generate_msi;
use std::fs::File;
use std::io::Cursor;
use std::path::PathBuf;

fn create_project(version: &str, product_code: &str, file_content: &'static str) -> MsiBuilderProject {
    MsiBuilderProject {
        schema_version: 1,
        id: format!("test_upgrade_proj_{}", version),
        name: "Upgrade Test App".into(),
        package: PackageConfig {
            product_name: "Upgrade Test App".into(),
            manufacturer: "Upgrade Corp".into(),
            version: version.into(),
            description: Some("Upgrade test package".into()),
            product_code: product_code.into(),
            upgrade_code: "{99999999-8888-7777-6666-555555555555}".into(),
            architecture_id: "amd64".into(),
            install_context: "perUser".into(),
            install_root: "LocalAppDataFolder".into(),
            install_subdirectory: "UpgradeApp".into(),
            language: 1033,
            allow_uninstall: true,
            allow_repair: true,
            arp_entry: true,
            output_file_name: Some(format!("UpgradeApp-{}-x64.msi", version)),
            permission_preset: None,
            permission_sddl: None,
        },
        files: vec![
            PackageFile {
                id: "f_app".into(),
                component_id: "cmp_app".into(),
                component_guid: "{11112222-3333-4444-5555-666677778888}".into(),
                source_ref: "app.txt".into(),
                source_display_name: "app.txt".into(),
                relative_source_path: None,
                destination_directory: "".into(),
                destination_name: "app.txt".into(),
                size: file_content.len() as u64,
                last_modified: None,
                architecture_id: None,
                key_path: true,
                permission_preset: None,
                permission_sddl: None,
            },
        ],
        shortcuts: vec![
            ShortcutConfig {
                id: "sct_app".into(),
                name: "Upgrade Test App".into(),
                location: "startMenu".into(),
                start_menu_subdirectory: Some("Upgrade Corp".into()),
                target_file_id: "f_app".into(),
                arguments: None,
                description: Some("Launch App".into()),
                working_directory: None,
                show: "normal".into(),
                advertised: false,
                icon_file_id: None,
                icon_index: None,
            },
        ],
        registry: vec![
            RegistryValueConfig {
                id: "reg_ver".into(),
                hive: "HKCU".into(),
                key: "Software\\UpgradeCorp\\UpgradeApp".into(),
                name: Some("Version".into()),
                r#type: "string".into(),
                value: serde_json::json!(version),
                registry_view: "inherit".into(),
                owner_file_id: Some("f_app".into()),
                component_id: None,
                component_guid: None,
                permission_preset: None,
                permission_sddl: None,
            },
        ],
        services: vec![],
        folders: vec![],
        features: vec![],
        created_at: "2026-01-01T00:00:00Z".into(),
        updated_at: "2026-01-01T00:00:00Z".into(),
    }
}

fn build_msi_file(path: &str, project: &MsiBuilderProject, content: &'static str) {
    let out_path = PathBuf::from(path);
    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent).unwrap();
    }
    let file = File::options()
        .read(true)
        .write(true)
        .create(true)
        .truncate(true)
        .open(&out_path)
        .unwrap();
    generate_msi(file, project, |_| Ok(Cursor::new(content.as_bytes().to_vec()))).unwrap();
    println!("Built: {}", path);
}

fn main() {
    let p1 = create_project("1.0.0", "{AAAA1111-2222-3333-4444-555566667777}", "Version 1.0.0 contents");
    let p2 = create_project("2.0.0", "{BBBB1111-2222-3333-4444-555566667777}", "Version 2.0.0 contents");

    build_msi_file("fixtures/upgrade_v1.msi", &p1, "Version 1.0.0 contents");
    build_msi_file("fixtures/upgrade_v2.msi", &p2, "Version 2.0.0 contents");
}
