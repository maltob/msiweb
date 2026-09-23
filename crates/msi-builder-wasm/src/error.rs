use thiserror::Error;

#[derive(Error, Debug)]
pub enum MsiError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("MSI database error: {0}")]
    Msi(String),

    #[error("Cabinet compression error: {0}")]
    Cabinet(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Invalid configuration: {0}")]
    Config(String),
}

impl From<MsiError> for wasm_bindgen::JsValue {
    fn from(err: MsiError) -> Self {
        wasm_bindgen::JsValue::from_str(&err.to_string())
    }
}
