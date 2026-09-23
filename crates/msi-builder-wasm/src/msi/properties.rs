use crate::model::MsiBuilderProject;

#[derive(Clone, Debug)]
pub struct PropertyRow {
    pub name: String,
    pub value: String,
}

pub fn build_properties(project: &MsiBuilderProject) -> Vec<PropertyRow> {
    let pkg = &project.package;
    let mut props = Vec::new();

    props.push(PropertyRow {
        name: "ProductCode".to_string(),
        value: pkg.product_code.clone(),
    });

    props.push(PropertyRow {
        name: "ProductName".to_string(),
        value: pkg.product_name.clone(),
    });

    props.push(PropertyRow {
        name: "ProductVersion".to_string(),
        value: pkg.version.clone(),
    });

    props.push(PropertyRow {
        name: "Manufacturer".to_string(),
        value: pkg.manufacturer.clone(),
    });

    props.push(PropertyRow {
        name: "ProductLanguage".to_string(),
        value: pkg.language.to_string(),
    });

    props.push(PropertyRow {
        name: "UpgradeCode".to_string(),
        value: pkg.upgrade_code.clone(),
    });

    if pkg.install_context == "perMachine" {
        props.push(PropertyRow {
            name: "ALLUSERS".to_string(),
            value: "1".to_string(),
        });
    }

    if !pkg.allow_uninstall {
        props.push(PropertyRow {
            name: "ARPNOREMOVE".to_string(),
            value: "1".to_string(),
        });
    }

    if !pkg.allow_repair {
        props.push(PropertyRow {
            name: "ARPNOREPAIR".to_string(),
            value: "1".to_string(),
        });
    }

    props.push(PropertyRow {
        name: "ARPNOMODIFY".to_string(),
        value: "1".to_string(),
    });

    if !pkg.arp_entry {
        props.push(PropertyRow {
            name: "ARPSYSTEMCOMPONENT".to_string(),
            value: "1".to_string(),
        });
    }

    props.push(PropertyRow {
        name: "SecureCustomProperties".to_string(),
        value: "UPGRADEFOUND;NEWERVERSIONDETECTED".to_string(),
    });

    props
}
