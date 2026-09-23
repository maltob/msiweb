use crate::msi::ids::make_stable_id;
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct DirectoryRow {
    pub directory: String,
    pub parent: Option<String>,
    pub default_dir: String,
}

pub struct DirectoryTree {
    pub rows: Vec<DirectoryRow>,
    pub install_dir_id: String,
    pub dir_map: HashMap<String, String>, // normalized relative destination path -> directory ID
    pub start_menu_dir_id: Option<String>,
    pub desktop_dir_id: Option<String>,
}

pub fn build_directory_tree(
    architecture_id: &str,
    install_context: &str,
    install_root: &str,
    manufacturer: &str,
    install_subfolder: &str,
    destination_directories: &[String],
    need_start_menu: bool,
    start_menu_subfolder: Option<&str>,
    need_desktop: bool,
) -> DirectoryTree {
    let mut rows = Vec::new();
    let mut dir_map = HashMap::new();

    // TARGETDIR root
    rows.push(DirectoryRow {
        directory: "TARGETDIR".to_string(),
        parent: None,
        default_dir: "SourceDir".to_string(),
    });

    let is_64bit = architecture_id.to_lowercase() == "amd64";
    let is_per_user = install_context == "perUser";

    let root_folder_id = if is_per_user {
        "LocalAppDataFolder"
    } else if install_root == "ProgramFiles64Folder" || (is_64bit && install_root.is_empty()) {
        "ProgramFiles64Folder"
    } else {
        "ProgramFilesFolder"
    };

    rows.push(DirectoryRow {
        directory: root_folder_id.to_string(),
        parent: Some("TARGETDIR".to_string()),
        default_dir: ".".to_string(),
    });

    // Manufacturer folder
    let mfg_dir = if manufacturer.trim().is_empty() {
        "Company".to_string()
    } else {
        manufacturer.trim().to_string()
    };
    let mfg_id = "MANUFACTURERDIR".to_string();
    rows.push(DirectoryRow {
        directory: mfg_id.clone(),
        parent: Some(root_folder_id.to_string()),
        default_dir: mfg_dir,
    });

    // Main INSTALLDIR
    let subfolder = if install_subfolder.trim().is_empty() {
        "App".to_string()
    } else {
        install_subfolder.trim().to_string()
    };
    let install_dir_id = "INSTALLDIR".to_string();
    rows.push(DirectoryRow {
        directory: install_dir_id.clone(),
        parent: Some(mfg_id),
        default_dir: subfolder,
    });

    dir_map.insert("".to_string(), install_dir_id.clone());
    dir_map.insert(".".to_string(), install_dir_id.clone());
    dir_map.insert("/".to_string(), install_dir_id.clone());

    // Process nested directories from payload files
    let mut dir_counter = 1;
    for rel_path in destination_directories {
        let clean = rel_path.trim_matches(['/', '\\']).replace('\\', "/");
        if clean.is_empty() || clean == "." {
            continue;
        }

        let segments: Vec<&str> = clean.split('/').filter(|s| !s.is_empty()).collect();
        let mut current_parent = install_dir_id.clone();
        let mut accum_path = String::new();

        for seg in segments {
            if accum_path.is_empty() {
                accum_path = seg.to_string();
            } else {
                accum_path = format!("{}/{}", accum_path, seg);
            }

            if let Some(existing_id) = dir_map.get(&accum_path) {
                current_parent = existing_id.clone();
            } else {
                let new_id = make_stable_id("DIR", &format!("{}_{}", seg, dir_counter), 72);
                dir_counter += 1;
                rows.push(DirectoryRow {
                    directory: new_id.clone(),
                    parent: Some(current_parent),
                    default_dir: seg.to_string(),
                });
                dir_map.insert(accum_path.clone(), new_id.clone());
                current_parent = new_id;
            }
        }
    }

    // Start Menu folder
    let mut start_menu_id = None;
    if need_start_menu {
        rows.push(DirectoryRow {
            directory: "ProgramMenuFolder".to_string(),
            parent: Some("TARGETDIR".to_string()),
            default_dir: ".".to_string(),
        });
        if let Some(sub) = start_menu_subfolder {
            let clean_sub = sub.trim().trim_matches(['/', '\\']);
            if !clean_sub.is_empty() {
                let sub_id = "DIR_StartMenuFolder".to_string();
                rows.push(DirectoryRow {
                    directory: sub_id.clone(),
                    parent: Some("ProgramMenuFolder".to_string()),
                    default_dir: clean_sub.to_string(),
                });
                start_menu_id = Some(sub_id);
            } else {
                start_menu_id = Some("ProgramMenuFolder".to_string());
            }
        } else {
            start_menu_id = Some("ProgramMenuFolder".to_string());
        }
    }

    // Desktop folder
    let mut desktop_id = None;
    if need_desktop {
        rows.push(DirectoryRow {
            directory: "DesktopFolder".to_string(),
            parent: Some("TARGETDIR".to_string()),
            default_dir: ".".to_string(),
        });
        desktop_id = Some("DesktopFolder".to_string());
    }

    DirectoryTree {
        rows,
        install_dir_id,
        dir_map,
        start_menu_dir_id: start_menu_id,
        desktop_dir_id: desktop_id,
    }
}
