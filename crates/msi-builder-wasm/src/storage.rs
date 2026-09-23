#[cfg(target_arch = "wasm32")]
use std::io::SeekFrom;
use std::io::{Read, Seek, Write};

pub trait BuildFile: Read + Write + Seek {
    fn flush_build(&mut self) -> std::io::Result<()>;
}

impl<T: Read + Write + Seek> BuildFile for T {
    fn flush_build(&mut self) -> std::io::Result<()> {
        self.flush()
    }
}

#[cfg(target_arch = "wasm32")]
pub struct OpfsSyncFile {
    handle: web_sys::FileSystemSyncAccessHandle,
    position: u64,
}

#[cfg(target_arch = "wasm32")]
impl OpfsSyncFile {
    pub fn new(handle: web_sys::FileSystemSyncAccessHandle) -> Self {
        Self {
            handle,
            position: 0,
        }
    }

    pub fn inner(&self) -> &web_sys::FileSystemSyncAccessHandle {
        &self.handle
    }
}

#[cfg(target_arch = "wasm32")]
impl Read for OpfsSyncFile {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let mut opts = web_sys::FileSystemReadWriteOptions::new();
        opts.set_at(self.position as f64);
        
        let bytes_read = self
            .handle
            .read_with_u8_array_and_options(buf, &opts)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("{:?}", e)))?;
        
        let n = bytes_read as usize;
        self.position += n as u64;
        Ok(n)
    }
}

#[cfg(target_arch = "wasm32")]
impl Write for OpfsSyncFile {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        let mut opts = web_sys::FileSystemReadWriteOptions::new();
        opts.set_at(self.position as f64);
        
        let bytes_written = self
            .handle
            .write_with_u8_array_and_options(buf, &opts)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("{:?}", e)))?;
        
        let n = bytes_written as usize;
        self.position += n as u64;
        Ok(n)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.handle
            .flush()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("{:?}", e)))
    }
}

#[cfg(target_arch = "wasm32")]
impl Seek for OpfsSyncFile {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        let size = self
            .handle
            .get_size()
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("{:?}", e)))?
            as u64;

        let new_pos = match pos {
            SeekFrom::Start(offset) => offset,
            SeekFrom::Current(offset) => {
                let p = self.position as i64 + offset;
                if p < 0 {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        "invalid seek to negative position",
                    ));
                }
                p as u64
            }
            SeekFrom::End(offset) => {
                let p = size as i64 + offset;
                if p < 0 {
                    return Err(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        "invalid seek to negative position",
                    ));
                }
                p as u64
            }
        };

        self.position = new_pos;
        Ok(new_pos)
    }
}
