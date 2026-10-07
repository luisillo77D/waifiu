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

#[tauri::command]
fn search_duckduckgo(query: String) -> Result<Vec<String>, String> {
    let query_trimmed = query.trim();
    if query_trimmed.is_empty() {
        return Ok(Vec::new());
    }

    let encoded_query = query_trimmed
        .replace(' ', "+")
        .replace('&', "%26")
        .replace('#', "%23")
        .replace('?', "%3F");

    let url = format!("https://html.duckduckgo.com/html/?q={}", encoded_query);

    let body = ureq::get(&url)
        .set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0")
        .set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .set("Accept-Language", "es-ES,es;q=0.9,en;q=0.8")
        .timeout(std::time::Duration::from_secs(6))
        .call()
        .map_err(|e| format!("Network request failed: {}", e))?
        .into_string()
        .map_err(|e| format!("Failed to read response: {}", e))?;

    let mut snippets = Vec::new();
    let marker = "class=\"result__snippet\"";

    for part in body.split(marker).skip(1) {
        if snippets.len() >= 4 {
            break;
        }

        if let Some(start) = part.find('>') {
            let after_tag = &part[start + 1..];
            if let Some(end) = after_tag.find("</a>") {
                let snippet_raw = &after_tag[..end];
                let mut clean = String::new();
                let mut in_tag = false;
                for ch in snippet_raw.chars() {
                    if ch == '<' {
                        in_tag = true;
                    } else if ch == '>' {
                        in_tag = false;
                    } else if !in_tag {
                        clean.push(ch);
                    }
                }

                let clean = clean
                    .replace("&amp;", "&")
                    .replace("&quot;", "\"")
                    .replace("&#x27;", "'")
                    .replace("&#39;", "'")
                    .replace("&lt;", "<")
                    .replace("&gt;", ">")
                    .replace("&nbsp;", " ");

                let trimmed = clean.split_whitespace().collect::<Vec<_>>().join(" ");
                if !trimmed.is_empty() {
                    snippets.push(trimmed);
                }
            }
        }
    }

    Ok(snippets)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_cursor_info, search_duckduckgo])
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
