# Web MSI Builder

Web MSI Builder is a static, pure client-side web application that authors and compiles professional Windows Installer (.msi) packages directly inside your browser. All processing occurs local to the browser without uploading source files or metadata to any remote server.

Access it at https://maltob.github.io/msiweb/

## Overview

Traditional MSI authoring relies on heavyweight native command-line toolchains or remote build agents. Web MSI Builder eliminates this dependency by compiling native OLE compound file databases and MSZIP cabinet archives entirely client-side using WebAssembly and modern browser storage APIs.

### Privacy and Security

- Pure Client-Side Execution: All compilation, database serialization, and cabinet packaging run in a dedicated Web Worker.
- Zero Uploads: Your files, binaries, registry keys, and configurations never leave your machine.
- No Backend: The application operates completely offline as static assets.

## Key Features

### 1. Package Configuration and Upgrades
- Author product name, manufacturer, version, description, and unique GUIDs.
- Supports both x86 and AMD64/x64 architecture targets via an extensible architecture profile registry.
- Supports Per-Machine (Program Files, requires elevation) and Per-User (LocalAppData) installation scopes.
- Built-in major upgrade orchestration (Upgrade table, UPGRADEFOUND detection, and downgrade prevention).

### 2. Files and Directories
- Drag-and-drop file streaming into Origin Private File System (OPFS) storage with chunked SHA-256 hashing.
- Automatic directory hierarchy generation from destination paths.
- Support for explicit empty and populated folders using the Windows Installer CreateFolder table and RemoveFolders action for clean uninstall.
- In-place renaming and destination subdirectory management.

### 3. Desktop and Start Menu Shortcuts
- Create Start Menu and Desktop shortcuts referencing packaged executables.
- Support for arguments, descriptions, subfolders, and custom icon extraction.

### 4. Windows Registry Authoring
- Author keys and values across HKLM, HKCU, HKCR, and HKU hives.
- Supports REG_SZ, REG_EXPAND_SZ, REG_DWORD, REG_BINARY, and REG_MULTI_SZ data types.
- Configurable 32-bit and 64-bit registry views with proper MSI character escaping.

### 5. Windows Services
- Full ServiceInstall and ServiceControl table generation.
- Configure startup type (Automatic, Manual/Demand, Disabled) and error control.
- Control start on install, stop on uninstall, and delete on uninstall lifecycle behaviors.
- Service authoring is automatically restricted in per-user installations.

### 6. Security Permissions (ACLs)
- Windows Installer 5.0 MsiLockPermissionsEx table support.
- Apply security descriptors to folders, files, registry keys, and services.
- Quick-apply presets for common scenarios (Shared Data Full Access, Secure Admin Only, User Read-Only, Service Start/Stop).
- Custom Security Descriptor Definition Language (SDDL) input supported.
- Clean database guarantee: permission tables are completely omitted when not in use.

### 7. Portability and Storage Management
- Export and import self-contained .msibuilder project archives containing configuration and payload files in a portable ZIP format.
- Integrated Storage Manager to inspect OPFS quota usage and clean disposable build artifacts or orphaned payloads.
- Fast post-build downloads and streaming export via the File System Access API (showSaveFilePicker).

## Project Structure

- `apps/web`: React, TypeScript, Vite, and Tailwind CSS frontend application.
  - `src/components`: UI tabs, modals, and vector iconography.
  - `src/storage`: OPFS payload management and .msibuilder archive handling.
  - `src/worker`: Dedicated Web Worker hosting the WebAssembly compiler.
  - `src/validation`: Client-side preflight validation rules.
- `crates/msi-builder-wasm`: Rust WebAssembly compiler engine.
  - `src/msi`: OLE database generation, table schemas, cabinet packaging, and sequences.
  - `src/validate`: Engine-level package and component integrity validation.
  - `tests`: Automated integration tests verified against Windows Installer APIs.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Rust toolchain (optional, only needed when recompiling WebAssembly)
- wasm-pack (optional, for WebAssembly builds)

### Development Setup

1. Install web dependencies:
   ```shell
   cd apps/web
   npm install
   ```

2. Run the development server:
   ```shell
   npm run dev
   ```

3. Run test suites:
   ```shell
   npm test
   ```

4. Build for production:
   ```shell
   npm run build
   ```

### Building the WebAssembly Engine

To recompile the Rust engine into WebAssembly:
```shell
npx wasm-pack build crates/msi-builder-wasm --target web --out-dir ../../apps/web/src/wasm/pkg
```

## License

MIT
