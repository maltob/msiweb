use msi_builder_wasm::model::*;
use msi_builder_wasm::msi::generate_msi;
use std::fs::File;
use std::io::Cursor;
use tempfile::NamedTempFile;

fn sample_minimal_project() -> MsiBuilderProject {
    MsiBuilderProject {
        schema_version: 1,
        id: "proj_test_1".into(),
        name: "Test Product".into(),
        package: PackageConfig {
            product_name: "Test Product".into(),
            manufacturer: "Test Manufacturer".into(),
            version: "1.0.0".into(),
            description: Some("Test product description".into()),
            product_code: "{11111111-1111-1111-1111-111111111111}".into(),
            upgrade_code: "{22222222-2222-2222-2222-222222222222}".into(),
            architecture_id: "amd64".into(),
            install_context: "perMachine".into(),
            install_root: "ProgramFiles64Folder".into(),
            install_subdirectory: "TestProduct".into(),
            language: 1033,
            allow_uninstall: true,
            allow_repair: true,
            arp_entry: true,
            output_file_name: None,
            permission_preset: None,
            permission_sddl: None,
        },
        files: vec![
            PackageFile {
                id: "f1".into(),
                component_id: "cmp_hello".into(),
                component_guid: "{33333333-3333-3333-3333-333333333333}".into(),
                source_ref: "hello.txt".into(),
                source_display_name: "hello.txt".into(),
                relative_source_path: None,
                destination_directory: "".into(),
                destination_name: "hello.txt".into(),
                size: 13,
                last_modified: None,
                architecture_id: None,
                key_path: true,
                permission_preset: None,
                permission_sddl: None,
            },
        ],
        shortcuts: vec![
            ShortcutConfig {
                id: "s1".into(),
                name: "Test App".into(),
                location: "startMenu".into(),
                start_menu_subdirectory: Some("TestCompany".into()),
                target_file_id: "f1".into(),
                arguments: None,
                description: Some("Launch Test App".into()),
                working_directory: None,
                show: "normal".into(),
                advertised: false,
                icon_file_id: None,
                icon_index: None,
            },
        ],
        registry: vec![
            RegistryValueConfig {
                id: "r1".into(),
                hive: "HKLM".into(),
                key: "Software\\TestCompany\\TestProduct".into(),
                name: Some("Installed".into()),
                r#type: "dword".into(),
                value: serde_json::json!(1),
                registry_view: "inherit".into(),
                owner_file_id: Some("f1".into()),
                component_id: None,
                component_guid: None,
                permission_preset: None,
                permission_sddl: None,
            },
            RegistryValueConfig {
                id: "r2".into(),
                hive: "HKLM".into(),
                key: "Software\\TestCompany\\TestProduct".into(),
                name: Some("Version".into()),
                r#type: "string".into(),
                value: serde_json::json!("1.0.0"),
                registry_view: "inherit".into(),
                owner_file_id: Some("f1".into()),
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

#[test]
fn test_generate_and_parse_msi() {
    let project = sample_minimal_project();
    let temp_file = NamedTempFile::new().unwrap();
    let file = File::options()
        .read(true)
        .write(true)
        .open(temp_file.path())
        .unwrap();

    let (mut out_file, result) = generate_msi(file, &project, |source_ref| {
        if source_ref == "hello.txt" {
            Ok(Cursor::new(b"Hello, World!".to_vec()))
        } else {
            Err(msi_builder_wasm::error::MsiError::Storage("Not found".into()))
        }
    })
    .expect("generate_msi should succeed");

    assert!(result.size > 0);
    assert!(!result.sha256.is_empty());
    assert_eq!(result.metadata.file_count, 1);
    assert_eq!(result.metadata.shortcut_count, 1);
    assert_eq!(result.metadata.registry_count, 2);

    // Verify opening the generated MSI using msi crate
    let package = msi::Package::open(&mut out_file).expect("MSI should be readable by msi crate");
    assert_eq!(package.summary_info().title(), Some("Test Product"));
    assert_eq!(package.summary_info().author(), Some("Test Manufacturer"));
    assert_eq!(package.summary_info().arch(), Some("x64"));

    assert!(package.has_table("Property"));
    assert!(package.has_table("Directory"));
    assert!(package.has_table("Feature"));
    assert!(package.has_table("Component"));
    assert!(package.has_table("FeatureComponents"));
    assert!(package.has_table("File"));
    assert!(package.has_table("Media"));
    assert!(package.has_table("Shortcut"));
    assert!(package.has_table("Registry"));
    assert!(package.has_table("Upgrade"));
    assert!(package.has_table("LaunchCondition"));
    assert!(package.has_table("InstallExecuteSequence"));

    // Verify clean database without unused ACL tables
    assert!(!package.has_table("MsiLockPermissionsEx"));
    assert!(!package.has_table("CreateFolder"));

    // Verify embedded cabinet stream
    assert!(package.has_stream("cab1.cab"));
}

#[test]
fn test_permissions_tables_and_cleanup() {
    let mut project = sample_minimal_project();
    // 1. Enable permissions on folder, file, and registry
    project.package.permission_preset = Some("shared_all".into());
    project.files[0].permission_preset = Some("admin_only".into());
    project.registry[0].permission_preset = Some("readonly_users".into());

    let temp_file1 = NamedTempFile::new().unwrap();
    let file1 = File::options().read(true).write(true).open(temp_file1.path()).unwrap();
    let (mut out1, _) = generate_msi(file1, &project, |_| {
        Ok(Cursor::new(b"Hello, World!".to_vec()))
    }).expect("generate_msi with permissions should succeed");

    let mut package1 = msi::Package::open(&mut out1).expect("read package1");
    assert!(package1.has_table("MsiLockPermissionsEx"), "Should have MsiLockPermissionsEx table");
    assert!(package1.has_table("CreateFolder"), "Should have CreateFolder table for folder ACL");

    let lock_rows: Vec<_> = package1.select_rows(msi::Select::table("MsiLockPermissionsEx")).expect("select MsiLockPermissionsEx").collect();
    assert_eq!(lock_rows.len(), 3, "Expected 3 rows in MsiLockPermissionsEx (folder, file, registry)");

    let folder_rows: Vec<_> = package1.select_rows(msi::Select::table("CreateFolder")).expect("select CreateFolder").collect();
    assert_eq!(folder_rows.len(), 1, "Expected 1 row in CreateFolder");

    // 2. Remove permissions / items: clear folder ACL, remove file ACL, clear registry ACL
    project.package.permission_preset = None;
    project.files[0].permission_preset = None;
    project.registry[0].permission_preset = None;

    let temp_file2 = NamedTempFile::new().unwrap();
    let file2 = File::options().read(true).write(true).open(temp_file2.path()).unwrap();
    let (mut out2, _) = generate_msi(file2, &project, |_| {
        Ok(Cursor::new(b"Hello, World!".to_vec()))
    }).expect("generate_msi after cleanup should succeed");

    let package2 = msi::Package::open(&mut out2).expect("read package2");
    assert!(!package2.has_table("MsiLockPermissionsEx"), "MsiLockPermissionsEx table must be cleaned up / absent");
    assert!(!package2.has_table("CreateFolder"), "CreateFolder table must be cleaned up / absent");
}

#[test]
fn test_explicit_and_empty_folders() {
    let mut project = sample_minimal_project();
    project.folders = vec![
        FolderConfig {
            id: "fld_logs".into(),
            path: "logs".into(),
            component_id: None,
            component_guid: None,
            permission_preset: Some("shared_all".into()),
            permission_sddl: None,
        },
        FolderConfig {
            id: "fld_plugins".into(),
            path: "plugins/cache".into(),
            component_id: None,
            component_guid: None,
            permission_preset: None,
            permission_sddl: None,
        },
    ];

    let temp_file1 = NamedTempFile::new().unwrap();
    let file1 = File::options().read(true).write(true).open(temp_file1.path()).unwrap();
    let (mut out1, _) = generate_msi(file1, &project, |_| {
        Ok(Cursor::new(b"Hello, World!".to_vec()))
    }).expect("generate_msi with folders should succeed");

    let mut package1 = msi::Package::open(&mut out1).expect("read package1");
    assert!(package1.has_table("CreateFolder"), "CreateFolder table must be present");
    assert!(package1.has_table("MsiLockPermissionsEx"), "MsiLockPermissionsEx table must be present for logs folder");

    let folder_rows: Vec<_> = package1.select_rows(msi::Select::table("CreateFolder")).expect("select CreateFolder").collect();
    assert_eq!(folder_rows.len(), 2, "Expected 2 rows in CreateFolder for the two explicit folders");

    let lock_rows: Vec<_> = package1.select_rows(msi::Select::table("MsiLockPermissionsEx")).expect("select MsiLockPermissionsEx").collect();
    assert_eq!(lock_rows.len(), 1, "Expected 1 row in MsiLockPermissionsEx for logs");

    // Check InstallExecuteSequence has RemoveFolders (3600) and CreateFolders (3700)
    let seq_rows: Vec<_> = package1.select_rows(msi::Select::table("InstallExecuteSequence")).expect("select InstallExecuteSequence").collect();
    let has_remove_folders = seq_rows.iter().any(|r| {
        r["Action"].as_str() == Some("RemoveFolders")
    });
    let has_create_folders = seq_rows.iter().any(|r| {
        r["Action"].as_str() == Some("CreateFolders")
    });
    assert!(has_remove_folders, "InstallExecuteSequence must contain RemoveFolders");
    assert!(has_create_folders, "InstallExecuteSequence must contain CreateFolders");

    // Clean up: remove folders
    project.folders.clear();
    let temp_file2 = NamedTempFile::new().unwrap();
    let file2 = File::options().read(true).write(true).open(temp_file2.path()).unwrap();
    let (mut out2, _) = generate_msi(file2, &project, |_| {
        Ok(Cursor::new(b"Hello, World!".to_vec()))
    }).expect("generate_msi after removing folders should succeed");

    let package2 = msi::Package::open(&mut out2).expect("read package2");
    assert!(!package2.has_table("CreateFolder"), "CreateFolder must be absent when no folders or root ACL");
    assert!(!package2.has_table("MsiLockPermissionsEx"), "MsiLockPermissionsEx must be absent");
}

