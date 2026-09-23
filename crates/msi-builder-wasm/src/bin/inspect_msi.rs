use std::fs::File;

fn main() {
    let path = "fixtures/per_user_spike.msi";
    let file = File::open(path).expect("open file");
    let comp = cfb::CompoundFile::open(file).expect("open cfb");

    println!("CLSID: {}", comp.root_entry().clsid().hyphenated());
    for entry in comp.walk() {
        let name = entry.name();
        println!("Entry: {} (is_stream: {}, size: {})", name, entry.is_stream(), entry.len());
    }
}
