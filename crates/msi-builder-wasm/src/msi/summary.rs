use crate::model::MsiBuilderProject;
use msi::{Language, SummaryInfo};
use uuid::Uuid;

pub fn populate_summary_info(summary: &mut SummaryInfo, project: &MsiBuilderProject) {
    let pkg = &project.package;
    let is_64bit = pkg.architecture_id.to_lowercase() == "amd64";

    summary.set_codepage(msi::CodePage::Windows1252);

    summary.set_title(if pkg.product_name.is_empty() {
        "Installation Database".to_string()
    } else {
        pkg.product_name.clone()
    });

    summary.set_subject(pkg.product_name.clone());
    summary.set_author(pkg.manufacturer.clone());
    if let Some(ref desc) = pkg.description {
        summary.set_comments(desc.clone());
    }

    let arch_token = if is_64bit { "x64" } else { "Intel" };
    summary.set_arch(arch_token);
    summary.set_languages(&[Language::from_code(pkg.language)]);

    // Generate package code (fresh UUID for this specific package compilation)
    let package_code = Uuid::new_v4();
    summary.set_uuid(package_code);

    // WordCount: Bit 0 = 0 (short names) or 1 (long names); Bit 1 = 1 (compressed files/cabinet)
    // Value 2 = compressed in cabinet, long filenames supported
    summary.set_word_count(2);

    // PageCount: minimum Windows Installer version (200 = 2.0, required for 64-bit packages)
    summary.set_page_count(if is_64bit { 200 } else { 100 });

    summary.set_creating_application("MSI Builder (all processing occurs local to the browser)");
    summary.set_creation_time_to_now();
}
