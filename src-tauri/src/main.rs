// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// In your main function, register these commands:
fn main() {
    everett_lib::run()
}