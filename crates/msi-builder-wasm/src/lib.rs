pub mod error;
pub mod model;
pub mod msi;
pub mod normalize;
pub mod storage;
pub mod validate;

use model::MsiBuilderProject;
use std::collections::HashMap;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn validate_project_json(project_json: &str) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let project: MsiBuilderProject = serde_json::from_str(project_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid project JSON: {}", e)))?;
    let diagnostics = validate::validate_project(&project);
    let mut errors = Vec::new();
    let mut warnings = Vec::new();
    for diag in diagnostics {
        if diag.severity == "error" {
            errors.push(diag);
        } else {
            warnings.push(diag);
        }
    }
    let report = model::ValidationReport {
        is_valid: errors.is_empty(),
        errors,
        warnings,
    };
    serde_wasm_bindgen::to_value(&report)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

#[wasm_bindgen]
pub fn generate_deterministic_guid(project_id: &str, resource_key: &str) -> String {
    normalize::generate_deterministic_component_guid(project_id, resource_key)
}

/// In-memory build for testing or fallback
#[wasm_bindgen]
pub struct MemoryBuildOutput {
    bytes: Vec<u8>,
    result: JsValue,
}

#[wasm_bindgen]
impl MemoryBuildOutput {
    #[wasm_bindgen(getter)]
    pub fn bytes(&self) -> Vec<u8> {
        self.bytes.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn result(&self) -> JsValue {
        self.result.clone()
    }
}

/// Builds an MSI package where payloads are passed as a JS map/object of sourceRef -> Uint8Array
#[wasm_bindgen]
pub fn build_msi_memory(project_json: &str, payload_map: JsValue) -> Result<MemoryBuildOutput, JsValue> {
    console_error_panic_hook::set_once();
    let project: MsiBuilderProject = serde_json::from_str(project_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid project JSON: {}", e)))?;

    let payload_dict: HashMap<String, Vec<u8>> = serde_wasm_bindgen::from_value(payload_map)
        .map_err(|e| JsValue::from_str(&format!("Invalid payload map: {}", e)))?;

    let out_buffer = Cursor::new(Vec::new());
    let (cursor, result) = msi::generate_msi(out_buffer, &project, |source_ref| {
        payload_dict
            .get(source_ref)
            .map(|v| Cursor::new(v.clone()))
            .ok_or_else(|| error::MsiError::Storage(format!("Payload not found for sourceRef '{}'", source_ref)))
    })
    .map_err(|e| JsValue::from_str(&e.to_string()))?;

    let bytes = cursor.into_inner();
    let result_js = serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))?;

    Ok(MemoryBuildOutput {
        bytes,
        result: result_js,
    })
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn build_msi_opfs(
    project_json: &str,
    msi_sync_handle: web_sys::FileSystemSyncAccessHandle,
    payload_sync_handles: JsValue, // Map of source_ref -> FileSystemSyncAccessHandle
) -> Result<JsValue, JsValue> {
    console_error_panic_hook::set_once();
    let project: MsiBuilderProject = serde_json::from_str(project_json)
        .map_err(|e| JsValue::from_str(&format!("Invalid project JSON: {}", e)))?;

    let mut out_file = storage::OpfsSyncFile::new(msi_sync_handle);

    let handles_map: js_sys::Map = payload_sync_handles.dyn_into()
        .map_err(|_| JsValue::from_str("payload_sync_handles must be a Map"))?;

    let (_, result) = msi::generate_msi(&mut out_file, &project, |source_ref| {
        let js_key = JsValue::from_str(source_ref);
        let val = handles_map.get(&js_key);
        if val.is_undefined() {
            return Err(error::MsiError::Storage(format!("No handle found for sourceRef '{}'", source_ref)));
        }
        let handle: web_sys::FileSystemSyncAccessHandle = val.dyn_into()
            .map_err(|_| error::MsiError::Storage("Handle is not FileSystemSyncAccessHandle".to_string()))?;
        Ok(storage::OpfsSyncFile::new(handle))
    })
    .map_err(|e| JsValue::from_str(&e.to_string()))?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}
