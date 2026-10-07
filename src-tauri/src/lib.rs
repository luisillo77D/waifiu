use serde::Serialize;
use tauri::WebviewWindow;

#[derive(Serialize)]
pub struct CursorInfo {
    pub cursor_x: f64,
    pub cursor_y: f64,
    pub window_x: f64,
    pub window_y: f64,
}

#[tauri::command]
fn get_cursor_info(window: WebviewWindow) -> Result<CursorInfo, String> {
    let cursor = window.cursor_position().map_err(|e| e.to_string())?;
    let win_pos = window.outer_position().map_err(|e| e.to_string())?;

    Ok(CursorInfo {
        cursor_x: cursor.x,
        cursor_y: cursor.y,
        window_x: win_pos.x as f64,
        window_y: win_pos.y as f64,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_cursor_info])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
