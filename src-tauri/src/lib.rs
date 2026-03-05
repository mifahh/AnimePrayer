use std::io::BufReader;
use std::path::PathBuf;
use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn backup_file(
    app_handle: tauri::AppHandle,
    source_path: String,
    sub_folder: String,
) -> Result<String, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    let file_name = source
        .file_name()
        .ok_or("Could not get file name")?
        .to_string_lossy()
        .to_string();

    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let media_dir = app_data_dir.join(&sub_folder);
    std::fs::create_dir_all(&media_dir)
        .map_err(|e| format!("Failed to create media dir: {}", e))?;

    let dest = media_dir.join(&file_name);
    std::fs::copy(&source, &dest).map_err(|e| format!("Failed to copy file: {}", e))?;

    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
fn play_sound(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("Sound file not found: {}", file_path));
    }

    std::thread::spawn(move || {
        let (_stream, stream_handle) =
            rodio::OutputStream::try_default().expect("Failed to get audio output");
        let sink = rodio::Sink::try_new(&stream_handle).expect("Failed to create sink");
        let file = std::fs::File::open(&path).expect("Failed to open sound file");
        let source = rodio::Decoder::new(BufReader::new(file)).expect("Failed to decode audio");
        sink.append(source);
        sink.sleep_until_end();
    });

    Ok(())
}

#[tauri::command]
fn show_notification(
    title: String,
    body: String,
    image_path: Option<String>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::{
            Data::Xml::Dom::XmlDocument,
            UI::Notifications::{ToastNotification, ToastNotificationManager},
            core::HSTRING,
        };

        let mut xml =
            String::from(r#"<toast scenario="reminder"><visual><binding template="ToastGeneric">"#);

        // Title and body
        xml.push_str(&format!("<text><![CDATA[{}]]></text>", title));
        xml.push_str(&format!("<text><![CDATA[{}]]></text>", body));

        // Images
        if let Some(ref img) = image_path {
            xml.push_str(&format!(
                r#"<image src="file:///{}" />"#,
                img.replace("\\", "/")
            ));
        }

        xml.push_str(r#"</binding></visual><actions><action content="Close" arguments="dismiss" /></actions></toast>"#);

        let doc = XmlDocument::new().map_err(|e| format!("Failed to create XmlDocument: {}", e))?;
        doc.LoadXml(&HSTRING::from(xml))
            .map_err(|e| format!("Failed to load XML: {}", e))?;

        let toast = ToastNotification::CreateToastNotification(&doc)
            .map_err(|e| format!("Failed to create ToastNotification: {}", e))?;

        // Use the official app identifier (AUMID) so Windows shows the app's real logo
        let notifier = ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(
            "com.animeprayer.app",
        ))
        .map_err(|e| format!("Failed to create ToastNotifier: {}", e))?;

        notifier
            .Show(&toast)
            .map_err(|e| format!("Failed to show notification: {}", e))?;
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            window.show().unwrap();
                            window.set_focus().unwrap();
                        }
                    }
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            backup_file,
            play_sound,
            show_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
