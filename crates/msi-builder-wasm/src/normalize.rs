use crate::model::MsiBuilderProject;
use uuid::Uuid;

pub const MSI_BUILDER_NAMESPACE: Uuid = Uuid::from_bytes([
    0x3a, 0x9b, 0x4f, 0x18, 0x82, 0xe1, 0x47, 0xc5, 0x94, 0x1f, 0x6e, 0x92, 0x73, 0x8a, 0x5c, 0xb0,
]);

pub fn generate_deterministic_component_guid(project_id: &str, resource_key: &str) -> String {
    let name = format!("{}:{}", project_id, resource_key);
    let guid = Uuid::new_v5(&MSI_BUILDER_NAMESPACE, name.as_bytes());
    format!("{{{}}}", guid.hyphenated().to_string().to_uppercase())
}

pub fn ensure_project_guids(project: &mut MsiBuilderProject) {
    if project.package.product_code.is_empty() {
        project.package.product_code = format!("{{{}}}", Uuid::new_v4().hyphenated().to_string().to_uppercase());
    }
    if project.package.upgrade_code.is_empty() {
        project.package.upgrade_code = format!("{{{}}}", Uuid::new_v4().hyphenated().to_string().to_uppercase());
    }

    for file in &mut project.files {
        if file.component_guid.is_empty() {
            let resource_key = format!("{}/{}", file.destination_directory, file.destination_name);
            file.component_guid = generate_deterministic_component_guid(&project.id, &resource_key);
        }
    }

    for reg in &mut project.registry {
        if reg.owner_file_id.is_none() && reg.component_guid.is_none() {
            let resource_key = format!("{}:{}:{}", reg.hive, reg.key, reg.name.as_deref().unwrap_or(""));
            reg.component_guid = Some(generate_deterministic_component_guid(&project.id, &resource_key));
        }
    }
}
