// Sem console junto da janela no Windows (build release).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;

fn main() {
    tauri::Builder::default()
        // Primeiro plugin: a 2ª execução só foca a janela da 1ª e encerra.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            tray::show_main(app);
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![tray::set_tray_labels])
        .setup(|app| {
            tray::create(app)?;
            Ok(())
        })
        // Fechar a janela (X) encerra o app: sem janela, o loop termina, com bandeja ou não.
        .run(tauri::generate_context!())
        .expect("falha ao iniciar o app desktop");
}
