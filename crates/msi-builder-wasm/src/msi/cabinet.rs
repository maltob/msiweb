use crate::error::MsiError;
use cab::{CabinetBuilder, CompressionType};
use std::io::{Read, Seek, Write};

pub struct CabinetFileEntry {
    pub file_id: String,
    pub source_ref: String,
}

pub fn build_cabinet<W, F, R>(
    writer: W,
    entries: &[CabinetFileEntry],
    mut open_file: F,
) -> Result<W, MsiError>
where
    W: Write + Seek,
    F: FnMut(&str) -> Result<R, MsiError>,
    R: Read,
{
    let mut builder = CabinetBuilder::new();
    {
        let folder = builder.add_folder(CompressionType::MsZip);
        for entry in entries {
            folder.add_file(&entry.file_id);
        }
    }

    let mut cab_writer = builder
        .build(writer)
        .map_err(|e| MsiError::Cabinet(format!("Failed to initialize cabinet: {}", e)))?;

    while let Some(mut file_writer) = cab_writer
        .next_file()
        .map_err(|e| MsiError::Cabinet(format!("Failed to write cabinet file entry: {}", e)))?
    {
        let file_id = file_writer.file_name().to_string();
        let entry = entries
            .iter()
            .find(|e| e.file_id == file_id)
            .ok_or_else(|| MsiError::Cabinet(format!("File ID '{}' not found in entries", file_id)))?;

        let mut payload_reader = open_file(&entry.source_ref)?;
        std::io::copy(&mut payload_reader, &mut file_writer)
            .map_err(|e| MsiError::Cabinet(format!("Failed streaming payload for '{}': {}", file_id, e)))?;
    }

    let finished_writer = cab_writer
        .finish()
        .map_err(|e| MsiError::Cabinet(format!("Failed to finalize cabinet: {}", e)))?;

    Ok(finished_writer)
}
