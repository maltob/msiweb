use crate::model::ServiceConfig;

pub fn service_type_to_int(_svc: &ServiceConfig) -> i32 {
    // MVP: Win32 own-process service
    16 // 0x10
}

pub fn start_type_to_int(start_type: &str) -> i32 {
    match start_type.to_lowercase().as_str() {
        "auto" => 2,
        "demand" => 3,
        "disabled" => 4,
        _ => 2,
    }
}

pub fn error_control_to_int(error_control: &str) -> i32 {
    match error_control.to_lowercase().as_str() {
        "ignore" => 0,
        "normal" => 1,
        "critical" => 3,
        _ => 1,
    }
}

pub fn normalize_account_name(account: &str) -> String {
    match account {
        "LocalService" => "NT AUTHORITY\\LocalService".to_string(),
        "NetworkService" => "NT AUTHORITY\\NetworkService".to_string(),
        "LocalSystem" => "LocalSystem".to_string(),
        other => other.to_string(),
    }
}

pub fn service_control_event_bitmask(svc: &ServiceConfig) -> i32 {
    let mut event: i32 = 0;
    if svc.start_on_install {
        event |= 0x0001; // msidbServiceControlEventStart
    }
    if svc.stop_on_uninstall {
        event |= 0x0020; // msidbServiceControlEventUninstallStop
    }
    if svc.delete_on_uninstall {
        event |= 0x0080; // msidbServiceControlEventUninstallDelete
    }
    event
}
