use msi_builder_wasm::model::*;
use msi_builder_wasm::msi::generate_msi;
use std::fs::File;
use std::io::Cursor;
use std::path::PathBuf;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let out_path = if args.len() > 1 {
        PathBuf::from(&args[1])
    } else {
        PathBuf::from("fixtures/per_user_spike.msi")
    };

    if let Some(parent) = out_path.parent() {
        std::fs::create_dir_all(parent).unwrap();
    }

    let project = MsiBuilderProject {
        schema_version: 1,
        id: "spike_project_1".into(),
        name: "Spike Test App".into(),
        package: PackageConfig {
            product_name: "Spike Test App".into(),
            manufacturer: "Spike Corp".into(),
            version: "1.0.0".into(),
            description: Some("Spike test package for Windows Installer".into()),
            product_code: "{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}".into(),
            upgrade_code: "{B2C3D4E5-F6A7-8901-BCDE-F12345678901}".into(),
            architecture_id: "amd64".into(),
            install_context: "perUser".into(),
            install_root: "LocalAppDataFolder".into(),
            install_subdirectory: "SpikeApp".into(),
            language: 1033,
            allow_uninstall: true,
            allow_repair: true,
            arp_entry: true,
            output_file_name: Some("SpikeTestApp-1.0.0-x64.msi".into()),
            permission_preset: None,
            permission_sddl: None,
        },
        files: vec![
            PackageFile {
                id: "f_hello".into(),
                component_id: "cmp_hello".into(),
                component_guid: "{C3D4E5F6-A7B8-9012-CDEF-123456789012}".into(),
                source_ref: "hello.txt".into(),
                source_display_name: "hello.txt".into(),
                relative_source_path: None,
                destination_directory: "".into(),
                destination_name: "hello.txt".into(),
                size: 32,
                last_modified: None,
                architecture_id: None,
                key_path: true,
                permission_preset: None,
                permission_sddl: None,
            },
            PackageFile {
                id: "f_sub".into(),
                component_id: "cmp_sub".into(),
                component_guid: "{D4E5F6A7-B8C9-0123-DEFA-123456789013}".into(),
                source_ref: "sub/config.json".into(),
                source_display_name: "config.json".into(),
                relative_source_path: None,
                destination_directory: "config".into(),
                destination_name: "config.json".into(),
                size: 27,
                last_modified: None,
                architecture_id: None,
                key_path: true,
                permission_preset: None,
                permission_sddl: None,
            },
        ],
        shortcuts: vec![
            ShortcutConfig {
                id: "sct_start".into(),
                name: "Spike Test App".into(),
                location: "startMenu".into(),
                start_menu_subdirectory: Some("Spike Corp".into()),
                target_file_id: "f_hello".into(),
                arguments: None,
                description: Some("Launch Spike Test App".into()),
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
                key: "Software\\SpikeCorp\\SpikeApp".into(),
                name: Some("Version".into()),
                r#type: "string".into(),
                value: serde_json::json!("1.0.0"),
                registry_view: "inherit".into(),
                owner_file_id: Some("f_hello".into()),
                component_id: None,
                component_guid: None,
                permission_preset: None,
                permission_sddl: None,
            },
            RegistryValueConfig {
                id: "reg_dword".into(),
                hive: "HKCU".into(),
                key: "Software\\SpikeCorp\\SpikeApp".into(),
                name: Some("Installed".into()),
                r#type: "dword".into(),
                value: serde_json::json!(42),
                registry_view: "inherit".into(),
                owner_file_id: Some("f_hello".into()),
                component_id: None,
                component_guid: None,
                permission_preset: None,
                permission_sddl: None,
            },
        ],
        services: vec![],
        folders: vec![
            FolderConfig {
                id: "fld_logs".into(),
                path: "logs".into(),
                component_id: None,
                component_guid: None,
                permission_preset: None,
                permission_sddl: None,
            },
        ],
        features: vec![],
        created_at: "2026-01-01T00:00:00Z".into(),
        updated_at: "2026-01-01T00:00:00Z".into(),
    };

    let file = File::options()
        .read(true)
        .write(true)
        .create(true)
        .truncate(true)
        .open(&out_path)
        .unwrap();
    let (_, result) = generate_msi(file, &project, |source_ref| {
        match source_ref {
            "hello.txt" => Ok(Cursor::new(b"Hello from Spike Test App payload".to_vec())),
            "sub/config.json" => Ok(Cursor::new(b"{\"app\": \"SpikeTestApp\"}".to_vec())),
            other => Err(msi_builder_wasm::error::MsiError::Storage(format!("Unknown: {}", other))),
        }
    })
    .expect("Failed to build fixture MSI");

    println!("Successfully generated fixture MSI: {:?}", out_path);
    println!("File size: {} bytes, SHA-256: {}", result.size, result.sha256);
}
