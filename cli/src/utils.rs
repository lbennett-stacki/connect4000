pub fn clear_screen() {
    print!("{}[2J", 27 as char);
}
