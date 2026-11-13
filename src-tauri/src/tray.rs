//! Ícone na bandeja do sistema: "Abrir" (mostra e foca a janela) e "Sair".
//! Os rótulos nascem em pt-BR e o front troca pelos do idioma escolhido
//! (`set_tray_labels`, chamado por `src/lib/platform/desktop.ts`).

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Manager, State, Wry};

const MAIN_WINDOW: &str = "main";
const OPEN_ID: &str = "open";
const QUIT_ID: &str = "quit";

/// Itens do menu, guardados para trocar o texto quando o idioma muda.
/// Público porque o `#[tauri::command]` gera um macro exportado que o cita.
pub struct TrayMenu {
    open: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn create(app: &App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, OPEN_ID, "Abrir", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ID, "Sair do app", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip(app.package_info().name.clone())
        .on_menu_event(|app, event| match event.id.as_ref() {
            OPEN_ID => show_main(app),
            QUIT_ID => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;

    app.manage(TrayMenu { open, quit });
    Ok(())
}

/// Rótulos do menu no idioma do app.
#[tauri::command]
pub fn set_tray_labels(open: String, quit: String, menu: State<'_, TrayMenu>) -> Result<(), String> {
    menu.open.set_text(open).map_err(|error| error.to_string())?;
    menu.quit.set_text(quit).map_err(|error| error.to_string())?;
    Ok(())
}
