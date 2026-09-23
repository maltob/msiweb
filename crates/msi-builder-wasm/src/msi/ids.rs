pub fn sanitize_identifier(s: &str, max_len: usize) -> String {
    let mut out = String::new();
    for c in s.chars() {
        if c.is_ascii_alphanumeric() || c == '_' {
            out.push(c);
        } else if c == '.' || c == '-' || c == ' ' || c == '/' || c == '\\' {
            out.push('_');
        }
    }
    if out.is_empty() || out.chars().next().unwrap().is_ascii_digit() {
        out = format!("_{}", out);
    }
    if out.len() > max_len {
        out.truncate(max_len);
    }
    out
}

pub fn make_stable_id(prefix: &str, unique_part: &str, max_len: usize) -> String {
    let clean_prefix = sanitize_identifier(prefix, 16);
    let clean_unique = sanitize_identifier(unique_part, max_len.saturating_sub(clean_prefix.len() + 2));
    format!("{}_{}", clean_prefix, clean_unique)
}
