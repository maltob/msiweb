pub mod architecture;
pub mod components;
pub mod package;
pub mod registry;
pub mod services;
pub mod shortcuts;

use crate::model::{BuildDiagnostic, MsiBuilderProject};

pub fn validate_project(project: &MsiBuilderProject) -> Vec<BuildDiagnostic> {
    let mut diagnostics = Vec::new();
    package::validate_package(project, &mut diagnostics);
    architecture::validate_architecture(project, &mut diagnostics);
    components::validate_files_and_components(project, &mut diagnostics);
    shortcuts::validate_shortcuts(project, &mut diagnostics);
    registry::validate_registry(project, &mut diagnostics);
    services::validate_services(project, &mut diagnostics);
    diagnostics
}
