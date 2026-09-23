use crate::error::MsiError;
use crate::model::RegistryValueConfig;

pub fn hive_to_root(hive: &str) -> Result<i32, MsiError> {
    match hive.to_uppercase().as_str() {
        "HKCR" => Ok(0),
        "HKCU" => Ok(1),
        "HKLM" => Ok(2),
        "HKU" => Ok(3),
        other => Err(MsiError::Config(format!("Unsupported registry hive '{}'", other))),
    }
}

pub fn encode_registry_value(config: &RegistryValueConfig) -> Result<String, MsiError> {
    match config.r#type.as_str() {
        "string" => {
            let s = match &config.value {
                serde_json::Value::String(s) => s.clone(),
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => b.to_string(),
                _ => String::new(),
            };
            if s.starts_with('#') {
                Ok(format!("#{}", s))
            } else {
                Ok(s)
            }
        }
        "expandString" => {
            let s = match &config.value {
                serde_json::Value::String(s) => s.as_str(),
                _ => "",
            };
            Ok(format!("#%{}", s))
        }
        "dword" => {
            let num: i64 = match &config.value {
                serde_json::Value::Number(n) => n.as_i64().unwrap_or(0),
                serde_json::Value::String(s) => s.trim().parse().unwrap_or(0),
                _ => 0,
            };
            Ok(format!("#{}", num))
        }
        "binary" => {
            let hex_str = match &config.value {
                serde_json::Value::String(s) => s.replace([' ', '-', ':'], ""),
                _ => String::new(),
            };
            Ok(format!("#x{}", hex_str.to_uppercase()))
        }
        "multiString" => {
            match &config.value {
                serde_json::Value::Array(arr) => {
                    let items: Vec<String> = arr
                        .iter()
                        .map(|v| v.as_str().unwrap_or("").to_string())
                        .collect();
                    Ok(items.join("[~]"))
                }
                serde_json::Value::String(s) => {
                    let items: Vec<&str> = s.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
                    Ok(items.join("[~]"))
                }
                _ => Ok(String::new()),
            }
        }
        other => Err(MsiError::Config(format!("Unknown registry value type '{}'", other))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_string() {
        let mut r = RegistryValueConfig {
            id: "r1".into(),
            hive: "HKLM".into(),
            key: "Software\\Test".into(),
            name: Some("Val".into()),
            r#type: "string".into(),
            value: serde_json::json!("Hello"),
            registry_view: "inherit".into(),
            owner_file_id: None,
            component_id: None,
            component_guid: None,
            permission_preset: None,
            permission_sddl: None,
        };
        assert_eq!(encode_registry_value(&r).unwrap(), "Hello");

        r.value = serde_json::json!("#LiteralPound");
        assert_eq!(encode_registry_value(&r).unwrap(), "##LiteralPound");
    }

    #[test]
    fn test_encode_dword_and_expand() {
        let mut r = RegistryValueConfig {
            id: "r2".into(),
            hive: "HKCU".into(),
            key: "Software\\Test".into(),
            name: None,
            r#type: "dword".into(),
            value: serde_json::json!(42),
            registry_view: "inherit".into(),
            owner_file_id: None,
            component_id: None,
            component_guid: None,
            permission_preset: None,
            permission_sddl: None,
        };
        assert_eq!(encode_registry_value(&r).unwrap(), "#42");

        r.r#type = "expandString".into();
        r.value = serde_json::json!("%ProgramFiles%\\Test");
        assert_eq!(encode_registry_value(&r).unwrap(), "#%%ProgramFiles%\\Test");
    }

    #[test]
    fn test_encode_binary_and_multi() {
        let mut r = RegistryValueConfig {
            id: "r3".into(),
            hive: "HKLM".into(),
            key: "Software\\Test".into(),
            name: None,
            r#type: "binary".into(),
            value: serde_json::json!("01 02 03 04"),
            registry_view: "inherit".into(),
            owner_file_id: None,
            component_id: None,
            component_guid: None,
            permission_preset: None,
            permission_sddl: None,
        };
        assert_eq!(encode_registry_value(&r).unwrap(), "#x01020304");

        r.r#type = "multiString".into();
        r.value = serde_json::json!(["one", "two", "three"]);
        assert_eq!(encode_registry_value(&r).unwrap(), "one[~]two[~]three");
    }
}
