# Client-Side Web MSI Builder — Implementation Design

**Status:** Implementation-ready design draft 0.3  
**Audience:** LLM coding agent / engineering team  
**Primary goal:** Build a static, client-side web application that authors Windows Installer (`.msi`) packages without uploading source files to a server.  
**Selected UI direction:** Refined “Dashboard + Forms” design: one full-width workspace, top-level tabs, no redundant left rail, and build output shown only after a build is requested and succeeds.

---

## 1. Product summary

Create an easy-to-use browser application that lets a user assemble a Windows Installer package from local files and declarative configuration.

The application must support:

- Package metadata: product name, manufacturer, version, architecture, product code, upgrade code, description.
- Files and directories.
- Start Menu and Desktop shortcuts.
- Registry keys and values.
- Windows services.
- Uninstall and repair behavior appropriate for a normal MSI package.
- Preflight validation before build.
- Local MSI generation in the browser.
- Download of the generated `.msi` only after a successful build.
- Saving and reloading a **self-contained project archive** that contains both configuration and payload files.

The application should feel closer to a modern deployment/configuration editor than a low-level MSI database editor. The user should not need to understand MSI table syntax, component codes, cabinet streams, formatted registry encodings, or action sequencing.

### Privacy promise

The permanent product promise is:

> **Runs locally in your browser. Files are not uploaded.**

Do not add telemetry that contains file names, file contents, registry values, service arguments, package configuration, certificate material, or other project payload. The production application must not depend on any backend service for package creation, project storage, validation, or signing.

---

## 1.1 Confirmed product decisions

These decisions are requirements, not open questions:

- **Pure client-side forever.** The shipped builder is a static web application. No build, storage, validation, signing, or transformation service may be required on a server.
- **Unsigned output.** The builder produces unsigned MSI files. Code signing is explicitly the end user's responsibility after export.
- **Initial architectures:** x86 and AMD64/x64. Architecture handling must use an extensible profile/registry model rather than hard-coded UI branches so Arm64 or later architectures can be added without rewriting the domain model.
- **Install scope:** per-machine is the default. Per-user is supported where the project contents permit it. The Services feature is disabled while per-user is selected.
- **Generated MSI UI:** minimal/standard Windows Installer UI is sufficient initially. The domain model and MSI compiler must preserve a clean path to later license dialogs, destination selection, and feature-selection UI.
- **Service MVP:** LocalSystem, LocalService, NetworkService; Automatic, Manual/Demand, Disabled; start/stop/delete lifecycle controls. Advanced service recovery, ACLs, credentials, and delayed-auto-start are future extensions.
- **Payload scale:** hundreds of megabytes through multi-gigabyte packages. The production build path must not require the whole input or output MSI to fit in JS or WASM linear memory.
- **Frontend:** React + TypeScript + Vite + Tailwind with shadcn/Radix-style primitives.
- **Project portability:** exported project files are self-contained and include all payload bytes. Files are copied into project-owned OPFS storage immediately after the user adds them.
- **Project storage cleanup:** users must have explicit controls to inspect and reclaim local browser storage. Cleanup must distinguish disposable build/temp data from payloads still referenced by a project and must never silently break a project.
- **Major upgrades are MVP:** v1→v2 major-upgrade behavior, stable UpgradeCode handling, new ProductCode generation for major releases, downgrade prevention, and Windows integration tests are required before the first public MVP is considered complete.
- **Browser target:** current Chromium-family browsers, especially Edge and Chrome, are the officially supported MVP target for multi-hundred-MB and multi-GB projects. Other modern browsers are progressive compatibility targets and must never trigger a server fallback.
- **Future capability direction:** keep extension points for environment variables, file associations, firewall rules, COM registration, prerequisites/bootstrapper generation, additional service options, richer MSI UI, and existing-MSI inspection/import.

### Terminology

Use **AMD64/x64** in user-facing text for 64-bit Intel/AMD Windows packages. Internally prefer a stable architecture ID such as `amd64`; display labels are data, not conditionals scattered through the UI.

## 2. Core architectural decision

### 2.1 Recommended stack

Use the following unless the implementation environment has a compelling reason to substitute equivalents:

**Web application**

- React
- TypeScript
- Vite
- Tailwind CSS
- Radix UI / shadcn-style primitives for dialogs, tabs, tables, dropdowns, tooltips, and toasts
- Zod for runtime schema validation
- Zustand or a small reducer/store for project state
- IndexedDB for lightweight metadata, recent-project pointers, and serialized `FileSystemHandle` objects where supported
- Origin Private File System (OPFS) as the primary high-performance project/build workspace

**MSI build engine**

- Rust compiled to WebAssembly
- `wasm-bindgen`
- `serde` / `serde-wasm-bindgen`
- `msi` Rust crate for reading/writing Windows Installer databases
- `cab` Rust crate for creating embedded cabinet data
- `uuid` for MSI identifiers

**Execution and storage model**

- Run packaging inside a **dedicated Web Worker**.
- Use OPFS temporary/workspace files and `FileSystemSyncAccessHandle` for seekable, synchronous random-access I/O from the worker.
- Implement Rust `Read`/`Write`/`Seek` adapters over the worker-side storage abstraction instead of assuming `Cursor<Vec<u8>>` for production builds.
- Stream source payloads into the build pipeline in bounded chunks; do not marshal all payload bytes through one giant JS object.
- Build the CAB and MSI into OPFS-backed seekable files.
- After success, stream/copy the final MSI to a user-selected local file where the File System Access API is available, with a normal browser download fallback for smaller outputs.
- Keep the main UI responsive; report byte-accurate progress where available.

The `msi` and `cab` crates remain appropriate candidates, but the feasibility spike must prove not just `wasm32` compilation, but also the custom seekable storage adapter and multi-hundred-MB behavior.

### 2.2 Browser support policy

The first public MVP is **Chromium-first** for large-package workflows.

Officially test and support:

- Current Microsoft Edge.
- Current Google Chrome.
- Secure-context deployment (`https://` or an equivalent trusted local development context).
- Dedicated Web Worker OPFS access for the seekable build workspace.
- File System Access save pickers where available for direct user-selected output destinations.

Compatibility policy:

- Feature-detect APIs; never rely only on user-agent strings.
- OPFS is the core internal workspace. `FileSystemSyncAccessHandle` is used only inside a dedicated worker.
- `showSaveFilePicker()` is a progressive enhancement because it is not uniformly available across major browsers.
- If direct user-visible filesystem writing is unavailable, allow a bounded download/export fallback only when the resulting file size is safe for that browser.
- If a browser cannot safely complete the requested package size locally, show an explicit compatibility error and recommend a supported Chromium browser.
- Never upload payloads to compensate for missing browser capabilities.
- Keep storage and build interfaces browser-neutral so Firefox/Safari support can improve without rewriting the MSI compiler.

### 2.3 Explicitly avoid for MVP

Do not make any of these foundational dependencies for the initial implementation:

- A backend API.
- A Windows VM or remote build service.
- WiX command-line tooling executed remotely.
- Wine.
- .NET on the server.
- PowerShell on the client.
- Browser extensions.
- Native helper executables.
- Custom MSI actions.

Do not introduce an optional native/server companion as part of the product architecture. External Windows tools may be documented for post-build ICE validation and signing, but they remain outside the builder.

---

## 3. Technical feasibility boundary

The application can author MSI structures client-side, but it must distinguish between two types of validation.

### 3.1 Browser preflight validation

The browser can and should validate:

- Required package fields.
- MSI identifier length and syntax.
- GUID format.
- Version syntax.
- Duplicate destination paths.
- Duplicate component resources.
- Component/key-path consistency.
- Shortcut target existence.
- Service executable ownership and service configuration rules.
- Registry hive/install-context compatibility.
- 32-bit/64-bit directory and component consistency.
- File sequence / media consistency generated by the app.
- Internal foreign-key relationships generated by the app.
- Upgrade-code/product-code consistency rules owned by the application.

### 3.2 Authoritative Windows ICE validation

Do **not** label browser preflight as “ICE validation.” Microsoft's ICE validators are executed through Windows Installer / Windows SDK tooling and `.cub` databases. The generated package should be designed to pass common ICE checks, but authoritative validation must occur later on Windows using tools such as `Msival2.exe` or Orca.

The UI should use these terms:

- **Validate** = client-side/preflight validation.
- **Windows ICE validation** = separate post-build verification step, shown in documentation/help.

---

# 4. User experience specification

## 4.1 Overall page layout

Use a single full-width workspace.

### Header

Left:

- Cube/package logo.
- Product name: **MSI Builder**.
- Short tagline: “Create professional Windows installer packages in your browser.”

Right:

- Green shield/status icon.
- “Runs locally in your browser”.
- Secondary text: “No data is uploaded.”
- Project overflow/menu button for Save/Export, Project Storage, and Delete Project.
- `Validate` button.
- Primary `Build MSI` button.

### Main body

At the top of the body:

- Heading: **Package Configuration**.
- Subtitle explaining that tabs configure package contents.

Below the heading, a horizontal tab bar:

1. Package Info
2. Files
3. Shortcuts
4. Registry
5. Services

Do not add a redundant sidebar or wizard rail.

### Build results behavior

There is **no permanent build pane**.

Before the user clicks Build MSI:

- No MSI output card is visible.
- The main form occupies the available width.

While building:

- Show an inline blocking progress dialog or large status card centered over the workspace.
- Show named stages instead of fake percentages when precise progress is unavailable.

After successful build:

- Show a success result card below the tabs/forms or in a modal/dialog.
- Show file name, size, SHA-256, build timestamp, and validation summary.
- Provide `Download MSI`.
- Provide `Rebuild`.
- Provide `Dismiss`.

After configuration changes following a successful build:

- Mark the previous result as **Out of date** or hide it.
- Never imply that an old MSI reflects current configuration.

---

# 5. Tab specifications

## 5.1 Package Info

### Package Information card

Fields:

- Product Name — required.
- Version — required.
- Manufacturer.
- Product Code — GUID with regenerate button.
- Upgrade Code — GUID with regenerate button and warning.
- Architecture — populated from the architecture profile registry. Initial enabled profiles: `x86` and `amd64` (displayed as “x64 / AMD64”).
- Description.

Behavior:

- Generate Product Code and Upgrade Code when a new project is created.
- Persist both values in the project file.
- Do not regenerate either on every render or build.
- Regenerating Upgrade Code requires a confirmation explaining that it creates a different product family for upgrade detection.

### Installation Details card

Fields:

- Installation context:
  - Per-machine
  - Per-user, only when project contents allow it
- Install root:
  - `ProgramFilesFolder` for x86 machine installs
  - `ProgramFiles64Folder` for x64 machine installs
  - appropriate per-user capable target when per-user is selected
- Application subfolder.
- Default language, MVP default `1033 English (United States)`.
- Allow uninstall — default on.
- Allow repair — default on.
- Add/Remove Programs entry — default on.

Rules:

- When **per-user** is selected, disable the Services tab and all service creation actions.
- If services already exist and the user attempts to switch to per-user, block the switch and offer to return to Services to remove them. Never silently delete service definitions.
- A project containing HKLM registry entries cannot be switched to per-user without resolving those entries.
- A 64-bit package must mark appropriate components as 64-bit and use the correct install folder.

### Optional metadata, collapsed under “Advanced”

- Comments.
- Keywords.
- Support URL.
- Product icon for Add/Remove Programs.
- Install location property.
- Minimum Windows Installer version.

Do not expose raw MSI table fields unless “Advanced mode” is intentionally added later.

---

## 5.2 Files

The Files tab is the most important day-to-day workflow.

### Empty state

Show a large drop zone:

> Drag files or folders here
>
> or choose files from your computer

Buttons:

- Add Files
- Add Folder

Support drag/drop.

Where available, folder selection may use browser directory-picker APIs. Always provide a standard `<input type="file" multiple>` fallback. Folder input can use `webkitdirectory` as progressive enhancement where supported.

### File table

Columns:

- Source name/path
- Destination
- Size
- Component
- Key path indicator
- Actions

Source paths are display-only and are never written as private local source paths into the MSI metadata.

### Destination model

Display destination using logical MSI folders instead of raw machine paths.

Example:

`ProgramFiles64Folder / Example Corp / My App / config / settings.json`

Destination editor:

- Install root dropdown.
- Relative folder.
- Target filename.

### Default component strategy

For MVP, use **one payload file per MSI component**.

Why:

- It is easy to reason about.
- The file can be the component KeyPath.
- It helps maintain Windows Installer component rules.
- It reduces hidden coupling in the UI.

Each file component gets:

- Stable internal Component ID string.
- Stable Component GUID.
- Destination Directory reference.
- Correct bitness flag.
- KeyPath = that file.

### Stable GUID generation

Do not randomly regenerate component GUIDs on each build.

Preferred rule:

- Persist each file/resource's logical resource ID in project JSON.
- Generate a component GUID once and persist it.

Alternative deterministic rule:

- UUID v5 from a project-specific namespace plus normalized resource identity.

Never derive a component GUID from transient source-machine absolute paths.

### File operations

Per row:

- Rename destination filename.
- Change destination folder.
- Remove.
- Replace source file while preserving resource identity/component GUID when the destination resource is logically the same.
- Reveal source metadata.

### Directory tree

A secondary tree view may be provided to make large packages easier to understand, but it is not required for MVP.

---

## 5.3 Shortcuts

### Shortcut list

Show cards or a compact table.

Columns:

- Name
- Location
- Target
- Arguments
- Working directory
- Icon
- Actions

### Add Shortcut dialog

Fields:

- Name — required.
- Location:
  - Start Menu
  - Desktop
- Target file — required; select from package files.
- Arguments.
- Working directory.
- Description.
- Show mode:
  - Normal
  - Minimized
  - Maximized
- Icon:
  - Use target icon
  - Choose packaged `.ico` or compatible icon resource
- Advertised shortcut — advanced, off by default.

MVP default: create non-advertised shortcuts.

### MSI mapping

Map shortcuts to the MSI `Shortcut` table.

For a non-advertised shortcut:

- `Directory_` = Start Menu/Desktop directory identifier.
- `Component_` = component controlling the target file.
- `Target` = formatted reference to the installed file/property.
- `Arguments` = optional formatted string.
- `WkDir` = directory identifier when set.

Shortcut lifetime must be controlled by a component with a valid key path.

### Start Menu folder

Allow optional nested subfolder such as:

`Programs / Example Corp / My App`

Generate Directory table entries and cleanup behavior as needed.

---

## 5.4 Registry

### Registry list

Columns:

- Hive
- Key
- Name
- Type
- Data
- 32/64-bit view
- Component/resource
- Actions

### Supported MVP hives

- `HKLM`
- `HKCU`
- `HKCR`

`HKU` may be added as an advanced option later.

### Supported MVP value types

Expose friendly registry value types:

- String (`REG_SZ`)
- Expandable string (`REG_EXPAND_SZ`)
- DWORD (`REG_DWORD`)
- Binary (`REG_BINARY`)
- Multi-string (`REG_MULTI_SZ`)

Do not expose `REG_QWORD` in the MVP because the standard MSI Registry table's native value encoding is centered on the types above.

### Registry value editor

Fields:

- Hive.
- Key path.
- Value name; blank means default value.
- Type.
- Value.
- Registry view:
  - Package default
  - 32-bit
  - 64-bit
- Remove on uninstall — default yes through normal component ownership.

The UI stores typed values. The MSI writer converts them to MSI Registry table encoding:

- String -> raw formatted text.
- Expandable string -> `#%...`.
- DWORD -> `#...`.
- Binary -> `#x...`.
- Multi-string -> strings joined with MSI `[~]` separators.

### Context validation

- HKLM implies machine-level installation.
- Per-user projects should use HKCU or context-sensitive roots.
- HKCU resources intended as a component key path should be authored consistently with Windows Installer per-user component rules.
- 64-bit registry entries require the correct 64-bit component attribute.

### Component strategy

For a registry value associated with a payload file:

- Attach it to the file's component unless there is a reason to make it independent.
- Keep the file as KeyPath.

For registry-only resources:

- Create a dedicated component.
- Use a registry value as the KeyPath.
- Persist a stable component GUID.

---

## 5.5 Services

The Services tab should make common Windows-service installation easy without exposing every SCM flag.

### Service list

Columns:

- Service name
- Display name
- Executable
- Startup
- Account
- Install behavior
- Uninstall behavior
- Actions

### Add Service dialog

Required:

- Service name.
- Display name.
- Executable — choose a packaged `.exe`.
- Startup type:
  - Automatic
  - Manual / demand
  - Disabled

Optional:

- Description.
- Arguments.
- Dependencies.
- Error control:
  - Normal default
  - Ignore
  - Critical advanced
- Start after install — default on for Automatic, configurable.
- Stop on uninstall — default on.
- Delete on uninstall — default on.
- Wait for service-control operation — default on.

### Service account MVP

Support only built-in service identities initially:

- LocalSystem
- LocalService
- NetworkService

Do not collect or store arbitrary account passwords in the first version.

Microsoft's Windows Installer documentation explicitly cautions against service configurations that impersonate a particular user because credentials can introduce security and maintenance problems.

### Service type MVP

Support:

- Win32 own-process service.

Optional phase 2:

- Shared-process service.

Do not support kernel drivers or file-system drivers; Windows Installer's `ServiceInstall` table does not support those service types.

### Critical MSI ownership rule

The service executable must be the KeyPath file of the component referenced by `ServiceInstall`.

Implementation rule:

1. User selects an executable from packaged files.
2. The application obtains that file's component.
3. Confirm the executable is the component KeyPath.
4. Add `ServiceInstall` referencing that component.
5. Add `ServiceControl` for install/uninstall behavior.

Do not create a separate service component pointing at another component's executable.

### ServiceControl defaults

Recommended default event behavior:

- Start on install when requested.
- Stop on uninstall.
- Delete on uninstall.

A `ServiceInstall` row alone is not enough to delete a service during uninstall; the generated `ServiceControl` row must include the uninstall-delete event.

### Per-user behavior

- Per-machine is the default package context.
- If `perUser` is selected, the Services tab remains visible for discoverability but is disabled with helper text: **“Windows services require a per-machine installation.”**
- If a project already contains one or more services, switching to per-user is blocked until the services are removed.
- Switching to per-machine immediately re-enables service configuration.
- Validation must still reject any imported/legacy project that contains services while marked per-user.

---

# 6. Validation UX

## 6.1 Validate button

`Validate` must work without building the MSI.

It runs project-model validation and simulated MSI mapping validation.

### Result dialog

Sections:

- Errors — must be fixed before build.
- Warnings — build allowed, but user should review.
- Information — generated defaults or compatibility notes.

Each issue contains:

- Code, e.g. `SVC001`.
- Human-readable title.
- Explanation.
- Navigation target.
- `Fix` action when deterministic.

Example:

`SVC004 — Service executable is not the component KeyPath.`

Clicking the issue switches to Services and highlights the row.

## 6.2 Validation rule families

Implement validators as isolated rule modules.

Suggested families:

- `PKGxxx` package metadata.
- `FILxxx` files/directories.
- `CMPxxx` component rules.
- `SCTxxx` shortcuts.
- `REGxxx` registry.
- `SVCxxx` services.
- `ARCxxx` architecture/bitness.
- `UPGxxx` upgrades/product identity.
- `MSIxxx` final table-model consistency.

### Must-have validation rules

Package:

- ProductName required.
- ProductVersion valid MSI version format.
- ProductCode and UpgradeCode valid GUIDs.
- Manufacturer recommended.
- Install folder name legal.

Files:

- At least one file.
- No duplicate destination path.
- No invalid target filename.
- Source handle still resolvable before build.

Components:

- Every component has a GUID.
- Every component has one key path strategy.
- Component resources remain in one destination folder.
- No resource belongs to multiple components.
- 64-bit resource/component flags consistent.

Shortcuts:

- Target exists.
- Target component exists.
- Name/location valid.
- Working-directory reference exists if specified.

Registry:

- Hive valid.
- Key present.
- Typed value encodes correctly.
- HKLM incompatible with true per-user package.
- 64-bit view requires valid package/component bitness.

Services:

- Per-machine package.
- Service name nonempty and contains no slash or backslash.
- Selected executable exists.
- Service executable is the key file of owning component.
- Service type supported.
- Startup type supported.
- Built-in account only in MVP.
- Delete-on-uninstall emits ServiceControl uninstall-delete.

---

# 7. Build experience

## 7.1 Build button behavior

When `Build MSI` is clicked:

1. Run validation.
2. If errors exist, do not build; show the validation dialog.
3. If only warnings exist, continue after the configured warning policy.
4. Snapshot the current versioned project manifest.
5. Estimate workspace requirements from total source size and call `navigator.storage.estimate()`.
6. Ensure an OPFS build workspace can be created; present an actionable storage error if quota is clearly insufficient.
7. Start the dedicated build worker.
8. Open source payloads as streamable/random-readable sources.
9. Build cabinet data using bounded buffers into OPFS-backed seekable storage.
10. Build the MSI database/CFB using an OPFS-backed `Read + Write + Seek` adapter.
11. Run final structural assertions.
12. Calculate SHA-256 incrementally without loading the whole MSI into memory.
13. Flush and close the OPFS output handle.
14. Mark the build as successful and expose save/export actions.
15. Save the MSI to the user-visible file system or download it without first materializing a multi-GB JS `Blob` when the selected browser supports direct file-system output.

**Hard requirement:** production builds must not create one `ArrayBuffer`/`Uint8Array` containing the entire payload or final MSI. A small-package compatibility path may use a Blob download, but it is not the primary architecture.

### Build stages displayed to user

- Preparing package
- Reading source files
- Building cabinet
- Writing installer database
- Verifying package structure
- Finalizing MSI

Avoid fake fine-grained percentage values unless the implementation has accurate byte-based progress.

## 7.2 Output filename

Default:

`<sanitized-product-name>-<version>-<arch>.msi`

Example:

`MyApplication-1.2.0-x64.msi`

Allow a package-level output filename override.

## 7.3 Post-build card

Only show after success.

Contents:

- Success icon.
- Output filename.
- Size.
- SHA-256.
- Architecture.
- Product version.
- Validation status.
- `Download MSI` primary button.
- `Build again` secondary button.

Optional details accordion:

- ProductCode.
- UpgradeCode.
- Number of files.
- Number of components.
- Number of shortcuts.
- Number of registry entries.
- Number of services.

---

# 8. Project persistence and self-contained archives

## 8.1 Browser working copy

Use OPFS as the durable local working area for active projects.

Recommended layout:

```text
/opfs/msi-builder/projects/<project-id>/
  manifest.json
  payload/
    <file-id>
    <file-id>
  metadata/
    source-index.json
  builds/
    current.cab
    current.msi
  temp/
```

IndexedDB should store only lightweight application metadata such as:

- project IDs and display names;
- last-opened timestamps;
- schema version;
- optional serialized external `FileSystemHandle` objects;
- UI preferences.

Do not duplicate multi-GB payloads into IndexedDB.

## 8.2 Self-contained project archive

Export/import a single self-contained project file. Suggested extension:

`.msibuilder`

Use a streaming, ZIP64-capable archive format (store/no-compression is acceptable for already-compressed binaries) with this logical layout:

```text
project.json
payload/<file-id>/<original-or-display-name>
assets/<asset-id>/...
checksums.json
```

Requirements:

- The archive contains every payload required to rebuild the MSI.
- `project.json` references payloads by stable logical ID, never absolute source-machine path.
- Archive writing is streamed to OPFS or a user-selected file; never assemble the complete archive in memory.
- Archive reading is incremental/random-access where practical.
- Include SHA-256 per payload in `checksums.json` so corrupted/incomplete imports can be detected before build.
- Support schema migrations on `project.json`.
- Preserve unknown forward-compatible fields where possible so older versions do not destructively rewrite newer projects.

## 8.3 Source ingestion

When users add files/folders:

1. Capture metadata immediately.
2. Assign a stable file/resource ID and component identity.
3. Copy the source into the project's OPFS `payload/` area in chunks.
4. Compute checksum during the copy.
5. Once the copy succeeds, the project is self-contained and no longer depends on the original external path/handle.

This intentionally favors portability and deterministic rebuilds over zero-copy editing.

For very large imports, show per-file and aggregate progress and allow cancellation between chunks/files.

## 8.4 Project storage management and cleanup

Users must be able to reclaim OPFS storage without understanding OPFS. Add a **Project Storage** dialog reachable from the project menu.

Display at minimum:

- Current project payload size.
- Build artifact size.
- Temporary/staging size.
- Orphaned payload size.
- Total application-owned storage usage when available through `navigator.storage.estimate()`.
- Browser-reported quota/available estimate when available, clearly labeled as an estimate.

Provide these actions:

1. **Clear build artifacts** — deletes completed/intermediate CAB/MSI files under `builds/` that are not currently being used by an active build. This is always safe and does not alter project configuration.
2. **Clear temporary files** — deletes stale files under `temp/`. Never remove files locked by an active worker/build.
3. **Remove orphaned payloads** — garbage-collects payload blobs that are not referenced by the current manifest or any retained recovery snapshot. Show reclaimed size before confirming where practical.
4. **Delete project from this browser** — deletes the project manifest, payloads, builds, temp data, and its IndexedDB metadata. Require explicit confirmation and offer **Export project first**.
5. **Clean all unused MSI Builder storage** — optional global storage manager that can remove stale temp/build data across projects while preserving all referenced project payloads.

File-removal semantics:

- Adding a source file immediately copies it into project-owned OPFS storage.
- Removing a file from the Files tab removes its manifest reference. The backing payload becomes eligible for garbage collection after the edit is committed and no undo/recovery snapshot references it.
- Do not silently delete a payload that is referenced by the active project.
- Do not make generic “Clear storage” perform destructive project deletion.
- Surface estimated reclaimed bytes for cleanup actions whenever possible.
- A failed or cancelled import must clean its incomplete staging file automatically or mark it as stale-temp for the next cleanup pass.
- A failed or cancelled build must close worker handles and make incomplete build artifacts eligible for cleanup.

Automatic housekeeping:

- On app startup, scan lightweight metadata for abandoned temp/build sessions.
- On successful build completion, delete obsolete transient scratch files while retaining only the most recent successful build artifact if the UI needs it.
- Before a large import/build, use `navigator.storage.estimate()` as an advisory preflight only; actual write failures remain authoritative.
- Never assume browser quota is fixed or equal to free disk space.

# 9. Project data model

Use typed, versioned project JSON.

```ts
export interface MsiBuilderProject {
  schemaVersion: 1;
  id: string;
  name: string;

  package: PackageConfig;
  files: PackageFile[];
  shortcuts: ShortcutConfig[];
  registry: RegistryValueConfig[];
  services: ServiceConfig[];
  features: InstallFeature[]; // MVP creates one default feature; model is future-ready

  createdAt: string;
  updatedAt: string;
}

export interface PackageConfig {
  productName: string;
  manufacturer: string;
  version: string;
  description?: string;
  productCode: string;
  upgradeCode: string;
  architectureId: string; // initial values: "x86", "amd64"; resolved through ArchitectureRegistry
  installContext: "perMachine" | "perUser";
  installRoot: "ProgramFilesFolder" | "ProgramFiles64Folder" | "LocalAppDataFolder";
  installSubdirectory: string;
  language: number;
  allowUninstall: boolean;
  allowRepair: boolean;
  arpEntry: boolean;
  outputFileName?: string;
}

export interface PackageFile {
  id: string;
  componentId: string;
  componentGuid: string;
  sourceRef: string;
  sourceDisplayName: string;
  relativeSourcePath?: string;
  destinationDirectory: string;
  destinationName: string;
  size: number;
  lastModified?: number;
  architectureId?: string; // absent = inherit package architecture
  keyPath: true;
}

export interface ShortcutConfig {
  id: string;
  name: string;
  location: "startMenu" | "desktop";
  startMenuSubdirectory?: string;
  targetFileId: string;
  arguments?: string;
  description?: string;
  workingDirectory?: string;
  show: "normal" | "minimized" | "maximized";
  advertised: boolean;
  iconFileId?: string;
  iconIndex?: number;
}

export type RegistryValueType =
  | "string"
  | "expandString"
  | "dword"
  | "binary"
  | "multiString";

export interface RegistryValueConfig {
  id: string;
  hive: "HKLM" | "HKCU" | "HKCR";
  key: string;
  name: string | null;
  type: RegistryValueType;
  value: string | number | string[];
  registryView: "inherit" | "32" | "64";
  ownerFileId?: string;
  componentId?: string;
  componentGuid?: string;
}

export interface ServiceConfig {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  executableFileId: string;
  arguments?: string;
  startType: "auto" | "demand" | "disabled";
  errorControl: "ignore" | "normal" | "critical";
  account: "LocalSystem" | "LocalService" | "NetworkService";
  dependencies: string[];
  startOnInstall: boolean;
  stopOnUninstall: boolean;
  deleteOnUninstall: boolean;
  wait: boolean;
}
```

### Extensible architecture registry

Do not model supported architectures as a TypeScript union that must be edited throughout the app.

```ts
export interface ArchitectureProfile {
  id: string;                  // e.g. "x86", "amd64", future "arm64"
  label: string;               // e.g. "x64 / AMD64 (64-bit)"
  enabled: boolean;
  msiTemplateToken: string;    // architecture token used in MSI summary/template data
  programFilesRoot: string;    // logical directory profile ID
  componentBitness: "32" | "64";
  registryDefaultView: "32" | "64";
  validationCapabilities: string[];
}

export interface ArchitectureRegistry {
  get(id: string): ArchitectureProfile | undefined;
  listEnabled(): ArchitectureProfile[];
}
```

Initial profiles:

- `x86`
- `amd64`

The UI renders `listEnabled()`; validators and compiler stages resolve behavior from the profile. Adding Arm64 later should primarily mean adding a tested profile/compiler capability, not modifying every form and switch statement.

### SourceRef abstraction

Do not put `File` objects or absolute local paths directly in application state.

Use a payload repository backed by OPFS:

```ts
interface PayloadRepository {
  importFile(file: File, relativePath?: string): Promise<PayloadRef>;
  openRead(ref: PayloadRef): Promise<ReadablePayload>;
  getMetadata(ref: PayloadRef): Promise<PayloadMetadata>;
  exportTo(ref: PayloadRef, destination: WritableStream): Promise<void>;
  remove(ref: PayloadRef): Promise<void>;
}

interface PayloadRef {
  payloadId: string;
}
```

A source file becomes project-owned once it has been copied successfully into OPFS. The build should consume project-owned payloads, not re-read arbitrary original source locations.

# 10. WebAssembly / worker interface

Keep the UI/worker/WASM boundary coarse for control messages but **do not** move payload bytes as one giant serialized request.

Suggested worker contract:

```ts
interface BuildStartRequest {
  projectId: string;
  manifest: MsiBuilderProject;
  workspace: {
    payloadDirectory: string;
    buildDirectory: string;
  };
}

type BuildWorkerMessage =
  | { type: "progress"; stage: BuildStage; completedBytes?: number; totalBytes?: number }
  | { type: "diagnostic"; diagnostic: BuildDiagnostic }
  | { type: "complete"; result: BuildResult }
  | { type: "failed"; diagnostics: BuildDiagnostic[] };

interface BuildResult {
  opfsPath: string;
  fileName: string;
  size: number;
  sha256: string;
  metadata: {
    productCode: string;
    upgradeCode: string;
    fileCount: number;
    componentCount: number;
  };
}
```

Rust should consume an abstract random-access storage interface rather than `Vec<u8>` output:

```rust
pub trait BuildFile: std::io::Read + std::io::Write + std::io::Seek {
    fn flush_build(&mut self) -> Result<(), BuildIoError>;
}
```

The WASM glue layer implements this against worker-owned OPFS sync access handles.

### Small-package fallback

For browsers/environments where OPFS sync access cannot be used, the application may expose a clearly bounded compatibility mode for small packages using memory-backed buffers. Do not silently attempt multi-GB memory builds.

# 11. MSI writer architecture

Implement the Rust code in layers.

```text
Project JSON
   |
   v
Domain model validation
   |
   v
Normalized MSI model
   |-- directories
   |-- components
   |-- files
   |-- shortcuts
   |-- registry
   |-- services
   |-- properties
   |-- upgrade rules
   v
CAB writer
   |
   v
MSI table writer
   |
   v
CFB/MSI bytes
```

Do not have UI components construct raw MSI table rows.

## 11.1 Rust module layout

```text
crates/msi-builder-wasm/
  src/
    lib.rs
    model.rs
    normalize.rs
    validate/
      mod.rs
      package.rs
      components.rs
      registry.rs
      shortcuts.rs
      services.rs
      architecture.rs
    msi/
      mod.rs
      ids.rs
      tables.rs
      sequences.rs
      cabinet.rs
      summary.rs
      properties.rs
      directories.rs
      components.rs
      files.rs
      shortcuts.rs
      registry.rs
      services.rs
      upgrade.rs
    error.rs
```

---

# 12. MSI package model

A Windows Installer package is a relational database stored inside a Compound File Binary container, with package metadata and binary streams. The builder should generate tables directly rather than attempting to serialize WiX XML and invoke WiX in the browser.

## 12.1 Core tables for MVP

Generate at minimum the tables needed by selected features, including:

- `Property`
- `Directory`
- `Feature`
- `Component`
- `FeatureComponents`
- `File`
- `Media`
- `Registry` when used
- `Shortcut` when used
- `Icon` when used
- `ServiceInstall` when used
- `ServiceControl` when used
- `Upgrade` for major-upgrade support
- `InstallExecuteSequence`
- required internal/schema tables expected by the MSI format/library

Only generate optional tables when needed.

## 12.2 Summary information

Populate MSI Summary Information including:

- Code page.
- Title.
- Subject.
- Author/manufacturer.
- Package architecture/language template.
- Revision/package code as appropriate.
- Creating application.

Use architecture-appropriate Template Summary values.

---

# 13. Directory model

Every package requires a `TARGETDIR` root.

Typical x64 machine-install tree:

```text
TARGETDIR
└── ProgramFiles64Folder
    └── MANUFACTURERDIR
        └── INSTALLDIR
            ├── CONFIGDIR
            └── LIBDIR
```

Also create special destinations when required:

- `ProgramMenuFolder`
- `DesktopFolder`

Directory identifiers are internal MSI identifiers and should not be exposed to normal users.

### Directory ID generation

Generate stable sanitized IDs from normalized logical paths, with collision-resistant suffixes.

Example:

`INSTALLDIR_CONFIG_7F3A`

Never use an arbitrary source machine absolute path as an MSI Directory identifier.

---

# 14. Feature and component model

MVP may use a single hidden/main feature:

- `MainFeature`

Every generated component is attached to `MainFeature` through `FeatureComponents`.

## Component rules owned by the builder

- One file component per payload file by default.
- Every component gets a stable GUID.
- File component KeyPath is the file row.
- A component's resources are contained in a single target directory.
- A service is added to the component containing its service executable.
- Registry-only components use a registry key/value as KeyPath.
- Do not reuse the same Component GUID for unrelated resources.
- If a component changes bitness or incompatible identity, create a new GUID.

These rules intentionally trade some package compactness for predictability and correctness.

---

# 15. File and cabinet generation

## 15.1 File table

For every payload file create:

- File identifier.
- Component reference.
- Target filename.
- File size.
- Version/language when extracted and supported; optional in first build.
- Attributes.
- Sequence number.

### Sequence

Assign monotonically increasing file sequence numbers.

## 15.2 Cabinet

MVP uses one embedded cabinet:

- MSZIP compression.
- `Media` row references the last file sequence.
- Cabinet stream is embedded in the MSI.

The internal cabinet member names must match the file identifiers expected by Windows Installer, not arbitrary local absolute paths.

## 15.3 Large packages

Large-package support is a first-class requirement, not a future optimization.

Target working range:

- hundreds of MB routinely;
- 1+ GB supported when browser quota/disk space permit;
- design must not contain a fixed package-size ceiling caused by JS/WASM linear-memory buffering.

Requirements:

- Ingest payloads into OPFS in bounded chunks.
- Keep only small compression/read buffers in WASM memory.
- Use an OPFS-backed random-access adapter for CAB/MSI/CFB writers that require seek semantics.
- Query storage estimates before build and surface available/required space.
- Allow build cancellation at safe checkpoints.
- Flush/close handles deterministically on success, failure, or cancellation.
- Clean stale build temp files on startup and after failed builds.
- Generate hashes incrementally.
- Avoid copying output through multiple full-size intermediate files unless required by the selected CAB/MSI implementation.

### Output strategy

Preferred path:

1. Build final MSI in OPFS.
2. Let the user choose a destination using the File System Access API where available.
3. Stream/copy OPFS → user file in chunks.
4. Fall back to browser download only when compatible with the output size/browser.

A direct-to-user-file seekable writer may be added later where browser support is adequate, but OPFS remains the predictable cross-browser build workspace because its synchronous access handle is available inside dedicated workers and supports explicit offset reads/writes.

# 16. Registry mapping

Map friendly registry types to the `Registry` table.

Root mapping:

- HKCR -> `0`
- HKCU -> `1`
- HKLM -> `2`
- HKU -> `3` if future support is enabled
- Context-sensitive root -> `-1` only if deliberately exposed later

MSI value encoding:

```text
REG_SZ         -> plain value
REG_EXPAND_SZ  -> #%value
REG_DWORD      -> #123
REG_BINARY     -> #x0011AABB...
REG_MULTI_SZ   -> one[~]two[~]three
```

Escape leading `#` correctly for literal string values.

Implement encoding in a dedicated Rust function with unit tests.

---

# 17. Shortcut mapping

Create `Shortcut` rows only for user-configured shortcuts.

MVP should default to non-advertised shortcuts because they map naturally to explicit installed-file targets.

Key rules:

- Shortcut `Component_` controls creation/removal.
- The component must have a valid KeyPath.
- Location is represented through `Directory_`.
- Target is generated as an MSI formatted installed-file/property reference.
- Arguments are validated for project references but otherwise preserved.
- Working directory references an MSI directory identifier.

Do not assign shortcut hotkeys in the MVP.

---

# 18. Service mapping

Create a `ServiceInstall` row for each configured service and a corresponding `ServiceControl` row for lifecycle behavior.

## 18.1 ServiceInstall

Populate:

- Internal service-install identifier.
- Service name.
- Display name.
- Type = own-process for MVP.
- Start type.
- Error control.
- Dependencies.
- Built-in account.
- Arguments.
- Component reference.
- Description when supported by the table/library implementation.

The controlling component's KeyPath must be the service executable.

## 18.2 ServiceControl

Build the Event bit field from UI booleans.

Examples:

- Start during install = install-start bit.
- Stop during uninstall = uninstall-stop bit.
- Delete during uninstall = uninstall-delete bit.

`Wait` defaults to true/1.

Do not rely on `ServiceInstall` alone for uninstall deletion.

---

# 19. Architecture / bitness

## Initial supported profiles

- x86
- AMD64/x64

These are data-driven architecture profiles, not a closed enum.

Rules are provided by the selected `ArchitectureProfile`:

- MSI Summary Information template token.
- Default Program Files directory profile.
- Component bitness attribute.
- Registry default view.
- Validation rules/capabilities.
- Future architecture-specific packaging rules.

AMD64/x64 packages use the appropriate 64-bit summary/template value, 64-bit component attributes where required, and the 64-bit Program Files target. x86 uses the 32-bit equivalents.

Adding a future architecture such as Arm64 requires:

1. a new architecture profile;
2. compiler support for its MSI semantics;
3. Windows integration fixtures;
4. enabling the profile after tests pass.

The UI must not contain architecture-specific if/else branches outside the profile/compiler capability layer.

# 20. Install context

## Per-machine

Default and recommended for MVP.

Set MSI properties appropriately for all-users installation.

Required when:

- Any Windows service is configured.
- Any required HKLM value exists.
- The selected target requires machine-level access.

## Per-user

Supported as a real product mode, but only for compatible resources.

UI behavior:

- Services tab is disabled.
- Add-service actions are unavailable.
- Any project with pre-existing service definitions must remove them before switching to per-user.
- Machine-only registry/file destinations are validated and must be resolved.

Compiler behavior:

- Never silently rewrite a service-bearing package from per-user to per-machine.
- Reject impossible imported states.
- Use per-user-compatible directory/property semantics.

# 21. Uninstall and repair

The MSI should be declarative so Windows Installer owns removal of installed resources.

MVP requirements:

- Installed files are removed when their components are removed.
- Shortcuts are removed with their controlling components.
- Registry values owned by components are removed normally.
- Services are stopped/deleted according to `ServiceControl`.
- Empty app-created Start Menu directories are removed where necessary.
- Add/Remove Programs metadata is populated.
- Repair is not disabled by default.

Avoid “manual uninstall scripts.”

---

# 22. Upgrades

Persist a stable `UpgradeCode` for the product family.

## MVP upgrade strategy

Support **major upgrade** semantics in the first public MVP. This is a release requirement, not a post-MVP enhancement.

Rules:

- UpgradeCode stays stable across related releases.
- ProductCode changes for a new major-upgrade package.
- Component GUIDs stay stable when the component identity/key path remains logically the same.
- The builder authors `Upgrade` detection and `RemoveExistingProducts` sequencing according to the selected upgrade strategy.
- Prevent accidental downgrade by default.

Advanced UI may later expose:

- Allow same-version reinstall.
- Allow downgrade.
- Upgrade schedule.

Do not expose these until integration tests are reliable.

---

# 23. MSI sequencing

The generator must create a known-good execute sequence rather than inventing action ordering from user configuration.

Use a fixed template based on standard Windows Installer actions.

At minimum, ensure actions needed for the included resources are sequenced correctly, including:

- Cost initialization/finalization.
- File installation.
- Registry writes.
- Shortcut creation.
- Service installation.
- Service start/stop/delete.
- Product registration.
- Removal operations.

Do not allow users to reorder MSI standard actions in MVP.

Do not support custom actions in MVP.

---

# 24. Installer UI inside the generated MSI

This is distinct from the web builder UI.

## MVP

Generate a package that works correctly with standard/minimal `msiexec` behavior. Do not require a custom authored MSI dialog suite for the first release.

## Future license and feature-selection UI

Adding these later is **moderate work, not an architectural rewrite**, provided the MVP keeps the compiler modular now.

Windows Installer already models:

- custom dialogs through `Dialog`, `Control`, `ControlEvent`, `ControlCondition`, and related UI tables;
- license text with a `ScrollableText` control and acceptance state;
- installable feature trees through the `Feature` and `FeatureComponents` tables;
- interactive feature selection with `SelectionTree`, `INSTALLLEVEL`, and feature-selection control events/properties.

### Design now to make that future work easy

1. Preserve the domain-level `features[]` collection that already exists in MVP; expose a feature editor when this capability is enabled.
2. Every component stores one or more logical feature IDs through the normalized model; the MSI writer never relies on a hard-coded feature name.
3. Keep UI-table emission in a separate compiler module (`msi/ui/*`) that can be absent in MVP.
4. Model `license` and installer presentation metadata as optional project capabilities, not raw table rows.
5. Do not couple directory choice exclusively to compile-time constants; preserve a public install-directory property suitable for a later Browse/Destination dialog.
6. Keep tests capable of running both silent (`/qn`) and full-UI install paths.

Suggested future project model:

```ts
interface InstallFeature {
  id: string;
  title: string;
  description?: string;
  parentId?: string;
  defaultState: "local" | "absent";
  configurable: boolean;
}

interface InstallerUiConfig {
  mode: "minimal" | "wizard";
  licenseAssetId?: string;
  allowDestinationSelection?: boolean;
  allowFeatureSelection?: boolean;
}
```

### Expected future effort

- **License agreement page:** relatively contained once generic Dialog/Control/ControlEvent emission exists.
- **Destination-folder page:** moderate because it interacts with public directory properties, costing, validation, and control events.
- **Feature selection:** moderate-to-high because feature hierarchy, selection state, install levels, costing, component ownership, repair/change behavior, and upgrade testing all need coverage.

Treat custom MSI UI as a later milestone, but architecting the feature model now avoids a migration of every component later.

# 25. Code signing

The builder produces **unsigned MSI output only**.

Requirements:

- Clearly identify generated MSI files as unsigned.
- Do not request or store PFX/PKCS#12 files.
- Do not implement Authenticode signing in the browser.
- Do not add a signing backend.
- Documentation may show external post-build signing workflows using the end user's preferred Windows signing tooling/certificate infrastructure.

Signing is intentionally outside product scope unless the product requirements are explicitly changed later.

# 26. Security model

Even though the app is local, it processes potentially sensitive binaries and configuration.

Requirements:

- No source-file upload endpoints.
- Strict Content Security Policy.
- No third-party analytics scripts in the builder page by default.
- Avoid remote fonts if offline/private operation is a goal.
- Sanitize all displayed filenames/path text.
- Never execute packaged binaries.
- Never inspect PE code by execution.
- Do not load user-provided HTML.
- Treat registry values and service arguments as untrusted text.
- Avoid custom MSI actions in MVP.
- Do not store service-account passwords.
- Do not persist signing private keys.

The builder is an authoring tool; it must never “test run” an executable in the browser or on the user's system.

---

# 27. Accessibility and interaction

Requirements:

- Full keyboard navigation.
- Visible focus states.
- Form labels bound to controls.
- Validation errors announced with ARIA live regions.
- Tabs use correct tablist semantics.
- Dialogs trap focus and restore it on close.
- Drag/drop always has button-based equivalent.
- Do not communicate state by color alone.
- Minimum AA contrast target.

---

# 28. Error handling

Create typed errors across layers.

Example build diagnostic:

```ts
interface BuildDiagnostic {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  resourceType?: "package" | "file" | "shortcut" | "registry" | "service";
  resourceId?: string;
  detail?: string;
}
```

Never expose a raw Rust panic as the primary UI error.

Development builds may offer an expandable technical trace.

Production errors should state:

- What failed.
- Which resource caused it.
- What the user can change.

---

# 29. Suggested repository structure

```text
msi-builder/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── features/
│       │   │   ├── package-info/
│       │   │   ├── files/
│       │   │   ├── shortcuts/
│       │   │   ├── registry/
│       │   │   ├── services/
│       │   │   ├── validation/
│       │   │   └── build/
│       │   ├── store/
│       │   ├── storage/
│       │   │   ├── opfs/
│       │   │   ├── archive/
│       │   │   └── payload-repository/
│       │   ├── architectures/
│       │   ├── worker/
│       │   ├── wasm/
│       │   └── schemas/
│       └── tests/
├── crates/
│   └── msi-builder-wasm/
│       ├── Cargo.toml
│       └── src/
├── fixtures/
│   ├── minimal/
│   ├── shortcuts/
│   ├── registry/
│   └── service/
├── tests/
│   └── windows-integration/
├── docs/
└── README.md
```

---

# 30. Testing strategy

Browser-only unit tests are not enough because the output is consumed by Windows Installer.

## 30.1 TypeScript tests

Test:

- Form validation.
- Store operations.
- Project import/export.
- Self-contained project archive export/import.
- OPFS project ingestion and cleanup.
- Conflict detection.
- UI navigation from validation errors.

Use Vitest + React Testing Library.

## 30.2 Rust tests

Test:

- Identifier sanitization.
- GUID persistence/determinism.
- Registry encoding.
- Directory normalization.
- Component mapping.
- Shortcut mapping.
- Service flags.
- File sequence/media generation.
- Seekable storage adapter behavior.
- Incremental hashing/chunked I/O.
- Architecture profile mapping.
- Summary information.

Create golden package-model tests before testing final binary bytes.

## 30.3 Browser/WASM tests

Run the full large-file browser/WASM suite against current stable Edge and Chrome. Run smaller compatibility smoke tests in other supported browsers when practical.

Test with Playwright:

- Add files.
- Configure package.
- Add shortcut.
- Add registry value.
- Add service.
- Validate.
- Build.
- Save/download generated MSI.
- Import/export a self-contained project archive.
- Build from a re-opened archive without access to the original source files.
- Inspect Project Storage and clear build/temp artifacts without changing package configuration.
- Remove a project file, run orphan cleanup, and verify only the unreferenced payload is reclaimed.
- Delete a local project and verify its project-owned OPFS tree and metadata are removed.

## 30.4 Windows integration tests — required before release

CI or a controlled Windows test runner should:

1. Generate fixture MSIs.
2. Run ICE validation where available.
3. Install with verbose MSI logging.
4. Verify files.
5. Verify shortcuts.
6. Verify registry.
7. Verify service configuration/start behavior.
8. Run repair.
9. Uninstall.
10. Verify cleanup.
11. Install v1 then v2 to test upgrade.

Example install test command:

```powershell
msiexec /i .\fixture.msi /qn /l*v .\install.log
```

Example uninstall:

```powershell
msiexec /x .\fixture.msi /qn /l*v .\uninstall.log
```

Do not consider the builder production-ready solely because the MSI can be parsed by the Rust library.

---

# 31. Implementation phases

## Phase 0 — Feasibility and storage spike

Goal: prove browser-generated MSI installation on Windows **and** prove the production storage strategy.

Build the smallest possible proof:

- Static React/Vite page.
- Select/import one file.
- Copy it into OPFS.
- Dedicated Worker obtains an OPFS sync access handle.
- Rust/WASM writes an embedded CAB and MSI through a seekable storage adapter.
- Save/export final MSI.
- MSI installs file under Program Files.
- Uninstall removes the file.

Acceptance gate:

- MSI generated in current Chrome/Edge without backend.
- No complete-output `Vec<u8>`/`ArrayBuffer` is required by the production-path spike.
- Package installs and uninstalls on a clean Windows test VM.
- The worker can write/read/seek a test artifact significantly larger than WASM's comfortable in-memory working set using bounded buffers.
- No corrupted CFB/MSI streams.

## Phase 1 — Package + files + self-contained project

- Selected full-width UI shell.
- Package Info tab.
- Files tab.
- Data-driven x86 + AMD64 architecture profiles.
- OPFS project workspace.
- Streaming file/folder ingestion.
- `.msibuilder` self-contained archive export/import.
- Validation framework.
- Worker/WASM MSI build.
- Embedded cabinet.
- Save/download result.
- Windows install/uninstall integration tests.

## Phase 2 — Shortcuts + registry

- Shortcut UI and mapping.
- Start Menu/Desktop destinations.
- Registry UI and typed value encoding.
- 32/64-bit view validation.
- Expanded ICE/integration checks.

## Phase 3 — Services

- Service UI.
- ServiceInstall mapping.
- ServiceControl mapping.
- Built-in accounts.
- Per-user Services-tab disabling and impossible-state validation.
- Service integration tests.

## Phase 4 — Upgrade reliability — MVP release gate

Major upgrades are required for MVP.

- Major upgrade support.
- Downgrade prevention.
- Identity rules.
- v1→v2 test matrix.

## Phase 5 — Large-package hardening + polish — MVP release gate

Large-package support is also required for MVP. The public MVP is not complete until Phases 0–5 pass their acceptance gates.

- Multi-GB profiling and quota UX on current stable Edge and Chrome.
- Project Storage UI.
- Clear build artifacts, stale temp data, and orphaned payloads.
- Safe local-project deletion with export-first affordance.
- Cancellation and stale-temp cleanup.
- Chunk-size tuning.
- Direct user-file streaming where supported.
- Accessibility audit.
- Offline/PWA packaging if desired.

## Phase 6 — Optional advanced capabilities

Architect for these from the domain/compiler boundaries, but do not implement them until the core is stable:

- Arm64 or future architecture profiles.
- Custom installer UI / license agreement.
- Multiple selectable features.
- Destination-folder selection UI.
- Environment variables.
- File associations.
- Firewall rules.
- COM registration.
- Service recovery configuration / ACLs / delayed auto-start.
- Advanced upgrade options.
- Multiple/external cabinets.
- Prerequisites/bootstrapper EXE generation.
- Existing MSI import/inspection.

# 32. LLM coding-agent instructions

An LLM implementing this design should follow these rules.

1. **Do not substitute a server-side builder.** The default architecture is client-side WebAssembly.
2. **Do not start with all tabs.** Prove the Phase 0 MSI first.
3. **Never invent MSI table relationships.** Reference official Windows Installer table documentation when adding a new resource type.
4. **Keep UI state separate from raw MSI rows.** Use a normalized domain model and a dedicated compiler/writer layer.
5. **Keep component identity stable.** Never regenerate component GUIDs on every build.
6. **Keep UpgradeCode stable.** Never silently regenerate it.
7. **Use one payload file per component initially.** Optimize only after correctness is established.
8. **Services attach to the executable component.** Its KeyPath must be the service executable.
9. **Create ServiceControl rows for uninstall behavior.** ServiceInstall alone is insufficient for delete-on-uninstall.
10. **Treat per-user compatibility as a validated capability, not a checkbox with no consequences.**
11. **No custom actions in MVP.** Prefer native MSI tables and standard actions.
12. **Do not call browser validation ICE validation.**
13. **Build in a dedicated Web Worker using OPFS-backed seekable I/O.** Never block the main UI thread and never require the full package in memory.
14. **Do not expose source-machine absolute paths in generated package metadata.**
15. **Do not upload user payloads.**
16. **Write fixture-driven Windows integration tests for every new resource type.**
17. **Do not add code signing until unsigned output is reliable and the signing threat model is documented.**
18. **No build-result pane before build.** Only show output/result UI after build starts/succeeds.
19. **No left wizard rail.** Tabs are the single primary navigation model.
20. **Preserve the visual simplicity of the selected mockup.** Advanced MSI concepts belong behind progressive disclosure.
21. **Projects are self-contained.** Once imported, payloads live in project-owned OPFS storage and exported `.msibuilder` archives include them.
22. **Architectures are profiles, not hard-coded enums.** Initial profiles are x86 and AMD64; new architectures plug in through the registry/compiler capability layer.
23. **Per-user disables services.** Do not auto-promote install scope or silently discard services.
24. **Keep a real domain-level feature model.** MVP may emit one feature, but component-to-feature assignment must not be hard-coded so future SelectionTree UI is possible.
25. **Unsigned output is final product behavior.** Do not build signing into the application.
26. **No server fallback.** If a browser lacks a required large-file capability, show a clear compatibility limitation rather than uploading payloads elsewhere.
27. **Chromium is the large-package MVP baseline.** Qualify current Edge and Chrome for hundreds-of-MB and multi-GB workflows; keep browser APIs behind capability adapters.
28. **Immediate ingestion is required.** A successfully added source file is copied into project-owned OPFS before the import operation is considered complete.
29. **Storage cleanup must be safe and visible.** Users can purge build/temp/orphaned data and delete projects explicitly; cleanup must never remove manifest-referenced payloads.
30. **Major upgrades are MVP.** Do not call the first public release complete until v1→v2 upgrade and downgrade-prevention tests pass on Windows.

---

# 33. Definition of done for MVP

A release candidate is complete when a non-MSI-expert can:

1. Open the web app from a static host.
2. Enter package name/version/manufacturer.
3. Add a folder of application files.
4. Select an x86 or AMD64/x64 architecture profile.
5. Create a Start Menu or Desktop shortcut.
6. Add common registry values.
7. Configure a basic own-process Windows service using a built-in account.
8. Click Validate and receive actionable errors.
9. Click Build MSI.
10. Save/download an MSI generated locally without uploading its contents.
11. Export the project as a self-contained `.msibuilder` archive and reopen it without the original source files.
12. Install the MSI successfully on Windows.
13. Verify files, shortcut, registry values, and service.
14. Repair the application.
15. Uninstall and cleanly remove owned resources.
16. Validate the generated package with Windows ICE tooling in the release test pipeline.
17. Complete large-package tests in current stable Edge and Chrome that demonstrate bounded-memory behavior with outputs well beyond typical WASM in-memory package size.
18. Use Project Storage to reclaim build/temp/orphaned data without damaging a buildable project.
19. Install v1 and then v2 successfully as a major upgrade, preserving the UpgradeCode relationship and preventing unintended downgrade.

---

# 34. Resolved product decisions

The remaining milestone-order questions from draft 0.2 are resolved:

1. **Major upgrades:** required for the first public MVP. Phase 4 is an MVP release gate.
2. **Large-package browser baseline:** current Chromium-family browsers (Edge and Chrome) are the official MVP target for the strongest large-package workflow. Other browsers are progressive compatibility targets.
3. **Self-contained archive UX:** adding a file immediately copies it into project-owned OPFS storage. Users receive explicit storage-management controls to reclaim build files, temp files, orphaned payloads, or entire local projects.

# 35. Research notes and references

Primary references used for this design:

- Microsoft — Installer Database: https://learn.microsoft.com/en-us/windows/win32/msi/installer-database
- Microsoft — Installation Package: https://learn.microsoft.com/en-us/windows/win32/msi/installation-package
- Microsoft — Windows Installer Components: https://learn.microsoft.com/en-us/windows/win32/msi/windows-installer-components
- Microsoft — Directory Table: https://learn.microsoft.com/en-us/windows/win32/msi/directory-table
- Microsoft — Registry Table: https://learn.microsoft.com/en-us/windows/win32/msi/registry-table
- Microsoft — Shortcut Table: https://learn.microsoft.com/en-us/windows/win32/msi/shortcut-table
- Microsoft — ServiceInstall Table: https://learn.microsoft.com/en-us/windows/win32/msi/serviceinstall-table
- Microsoft — ServiceControl Table: https://learn.microsoft.com/en-us/windows/win32/msi/servicecontrol-table
- Microsoft — Using 64-Bit Windows Installer Packages: https://learn.microsoft.com/en-us/windows/win32/msi/using-64-bit-windows-installer-packages
- Microsoft — ICE Reference: https://learn.microsoft.com/en-us/windows/win32/msi/ice-reference
- Microsoft — About the User Interface: https://learn.microsoft.com/en-us/windows/win32/msi/about-the-user-interface
- Microsoft — LicenseAgreement Dialog: https://learn.microsoft.com/en-us/windows/win32/msi/licenseagreement-dialog
- Microsoft — Selection Dialog: https://learn.microsoft.com/en-us/windows/win32/msi/selection-dialog
- Microsoft — Feature Table: https://learn.microsoft.com/en-us/windows/win32/msi/feature-table
- Microsoft — FeatureComponents Table: https://learn.microsoft.com/en-us/windows/win32/msi/featurecomponents-table
- Microsoft — ADDLOCAL: https://learn.microsoft.com/en-us/windows/win32/msi/addlocal
- MDN — Origin private file system: https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- MDN — FileSystemSyncAccessHandle: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle
- MDN — FileSystemWritableFileStream: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream
- Microsoft — Validating an Installation Database: https://learn.microsoft.com/en-us/windows/win32/msi/validating-an-installation-database
- Microsoft — Msival2.exe: https://learn.microsoft.com/en-us/windows/win32/msi/msival2-exe
- Rust `msi` crate: https://docs.rs/msi/latest/msi/
- Rust `cab` crate: https://docs.rs/cab/latest/cab/
- Rust `cfb` crate: https://docs.rs/cfb/latest/cfb/
- FireGiant WiX schema — Component: https://docs.firegiant.com/wix/schema/wxs/component/
- FireGiant WiX schema — Shortcut: https://docs.firegiant.com/wix/schema/wxs/shortcut/
- FireGiant WiX schema — ServiceInstall: https://docs.firegiant.com/wix/schema/wxs/serviceinstall/

## Important research conclusion

A pure-Rust, non-Windows MSI writer remains practical: the `msi` crate can read/write Windows Installer databases and the `cab` crate can write MSZIP cabinet data. Browser/WASM compatibility and adapter behavior must be proven rather than assumed.

For the required package sizes, OPFS is the preferred build workspace. Modern browser File System APIs expose OPFS synchronous access handles only inside dedicated workers, with random-offset read/write, truncate, flush, and size operations. That maps well to Rust `Read`/`Write`/`Seek` needs and avoids a full-MSI in-memory buffer. OPFS remains subject to browser storage quota, so quota estimation and error UX are mandatory.

Future MSI license and feature-selection UI is feasible without redesigning the web builder. Windows Installer's own UI model uses Dialog/Control/ControlEvent tables, while selectable features are already represented by Feature/FeatureComponents and can be manipulated through SelectionTree/install-level mechanisms. The main architectural requirement today is to avoid hard-coding every component into a single feature inside the compiler.

# 36. Recommended immediate next task for an implementation agent

Do **not** begin by implementing the five-tab UI.

Create a `spike/browser-msi` branch that proves this exact path:

```text
Browser File/Directory selection
  -> chunked copy into project-owned OPFS payload storage
  -> Dedicated Web Worker
  -> FileSystemSyncAccessHandle adapter
  -> Rust/WASM bounded buffers
  -> MSZIP CAB written to seekable OPFS file
  -> MSI/CFB written to seekable OPFS file
  -> incremental SHA-256
  -> flush/close
  -> save/copy to user-visible file OR bounded fallback download
  -> Windows install/uninstall test
```

The spike is successful only when the generated MSI installs and uninstalls on Windows **and** the production build path proves random-access disk-backed output without requiring the entire MSI in WASM/JS memory.

After that proof passes, implement Phase 1 UI using the selected full-width tabbed design and the self-contained OPFS project model.
- MDN — FileSystemSyncAccessHandle: https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle
- MDN — showSaveFilePicker(): https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
- MDN — StorageManager.estimate(): https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate


---

# 36. Draft 0.3 decision log

Changes from draft 0.2:

- Promoted major-upgrade support to an MVP release requirement.
- Declared current Edge and Chrome the official large-package MVP browser baseline.
- Confirmed immediate source ingestion into project-owned OPFS.
- Added a user-facing Project Storage manager and explicit safe cleanup semantics.
- Added cleanup, browser-baseline, and v1→v2 upgrade acceptance tests.
