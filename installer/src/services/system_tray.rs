use tauri::{
    AppHandle, Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
};
use anyhow::Result;

/// System tray service for post-installation management
pub struct SystemTrayService;

impl SystemTrayService {
    /// Initialize system tray icon with menu
    pub fn initialize(app: &AppHandle) -> Result<()> {
        // Create menu items
        let open_dashboard = MenuItem::new(app, "Open Dashboard", true, None::<&str>)?;
        let start_services = MenuItem::new(app, "Start Services", true, None::<&str>)?;
        let stop_services = MenuItem::new(app, "Stop Services", true, None::<&str>)?;
        let restart_services = MenuItem::new(app, "Restart Services", true, None::<&str>)?;
        let view_logs = MenuItem::new(app, "View Logs", true, None::<&str>)?;
        let check_updates = MenuItem::new(app, "Check for Updates", true, None::<&str>)?;
        let settings = MenuItem::new(app, "Settings", true, None::<&str>)?;
        let about = MenuItem::new(app, "About Agent Player", true, None::<&str>)?;
        let quit = MenuItem::new(app, "Quit", true, None::<&str>)?;

        // Create menu with separators
        let menu = Menu::with_items(
            app,
            &[
                &open_dashboard,
                &PredefinedMenuItem::separator(app)?,
                &start_services,
                &stop_services,
                &restart_services,
                &PredefinedMenuItem::separator(app)?,
                &view_logs,
                &settings,
                &PredefinedMenuItem::separator(app)?,
                &check_updates,
                &about,
                &PredefinedMenuItem::separator(app)?,
                &quit,
            ],
        )?;

        // Create tray icon
        let _tray = TrayIconBuilder::new()
            .menu(&menu)
            .icon(app.default_window_icon().unwrap().clone())
            .on_menu_event(move |app, event| {
                match event.id().as_ref() {
                    "Open Dashboard" => {
                        if let Err(e) = Self::open_dashboard() {
                            eprintln!("Failed to open dashboard: {}", e);
                        }
                    }
                    "Start Services" => {
                        if let Err(e) = Self::start_services() {
                            eprintln!("Failed to start services: {}", e);
                        }
                    }
                    "Stop Services" => {
                        if let Err(e) = Self::stop_services() {
                            eprintln!("Failed to stop services: {}", e);
                        }
                    }
                    "Restart Services" => {
                        if let Err(e) = Self::restart_services() {
                            eprintln!("Failed to restart services: {}", e);
                        }
                    }
                    "View Logs" => {
                        let app_handle = app.clone();
                        if let Err(e) = Self::open_logs_window(&app_handle) {
                            eprintln!("Failed to open logs window: {}", e);
                        }
                    }
                    "Check for Updates" => {
                        let app_handle = app.clone();
                        if let Err(e) = Self::check_for_updates(&app_handle) {
                            eprintln!("Failed to check for updates: {}", e);
                        }
                    }
                    "Settings" => {
                        let app_handle = app.clone();
                        if let Err(e) = Self::open_settings(&app_handle) {
                            eprintln!("Failed to open settings: {}", e);
                        }
                    }
                    "About Agent Player" => {
                        let app_handle = app.clone();
                        if let Err(e) = Self::show_about(&app_handle) {
                            eprintln!("Failed to show about: {}", e);
                        }
                    }
                    "Quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            })
            .build(app)?;

        println!("System tray initialized");
        Ok(())
    }

    /// Open dashboard in default browser
    pub fn open_dashboard() -> Result<()> {
        let url = "http://localhost:41521";

        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(["/C", "start", url])
                .spawn()?;
        }

        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(url)
                .spawn()?;
        }

        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(url)
                .spawn()?;
        }

        Ok(())
    }

    /// Start services based on deployment mode
    pub fn start_services() -> Result<()> {
        // Detect deployment mode and start accordingly
        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("systemctl")
                .args(["start", "agent-player.service"])
                .output()?;
            std::process::Command::new("systemctl")
                .args(["start", "agent-player-frontend.service"])
                .output()?;
        }

        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("launchctl")
                .args(["start", "com.agentplayer.backend"])
                .output()?;
            std::process::Command::new("launchctl")
                .args(["start", "com.agentplayer.frontend"])
                .output()?;
        }

        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("sc")
                .args(["start", "AgentPlayerBackend"])
                .output()?;
            std::process::Command::new("sc")
                .args(["start", "AgentPlayerFrontend"])
                .output()?;
        }

        println!("Services started");
        Ok(())
    }

    /// Stop services
    pub fn stop_services() -> Result<()> {
        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("systemctl")
                .args(["stop", "agent-player.service"])
                .output()?;
            std::process::Command::new("systemctl")
                .args(["stop", "agent-player-frontend.service"])
                .output()?;
        }

        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("launchctl")
                .args(["stop", "com.agentplayer.backend"])
                .output()?;
            std::process::Command::new("launchctl")
                .args(["stop", "com.agentplayer.frontend"])
                .output()?;
        }

        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("sc")
                .args(["stop", "AgentPlayerBackend"])
                .output()?;
            std::process::Command::new("sc")
                .args(["stop", "AgentPlayerFrontend"])
                .output()?;
        }

        println!("Services stopped");
        Ok(())
    }

    /// Restart services
    pub fn restart_services() -> Result<()> {
        Self::stop_services()?;
        std::thread::sleep(std::time::Duration::from_secs(2));
        Self::start_services()?;
        Ok(())
    }

    /// Open logs viewer window
    fn open_logs_window(app: &AppHandle) -> Result<()> {
        use tauri::WebviewUrl;

        // Check if window already exists
        if let Some(window) = app.get_webview_window("logs") {
            window.set_focus()?;
            return Ok(());
        }

        // Create new logs window
        tauri::WebviewWindowBuilder::new(
            app,
            "logs",
            WebviewUrl::App("logs.html".into())
        )
        .title("Agent Player - Logs Viewer")
        .inner_size(900.0, 600.0)
        .resizable(true)
        .center()
        .build()?;

        Ok(())
    }

    /// Check for updates
    fn check_for_updates(app: &AppHandle) -> Result<()> {
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            match super::updater::UpdaterService::check_for_updates().await {
                Ok(Some(update)) => {
                    println!("Update available: v{}", update.version);
                    // Show update notification
                }
                Ok(None) => {
                    println!("No updates available");
                }
                Err(e) => {
                    eprintln!("Failed to check for updates: {}", e);
                }
            }
        });

        Ok(())
    }

    /// Open settings window
    fn open_settings(app: &AppHandle) -> Result<()> {
        use tauri::WebviewUrl;

        if let Some(window) = app.get_webview_window("settings") {
            window.set_focus()?;
            return Ok(());
        }

        tauri::WebviewWindowBuilder::new(
            app,
            "settings",
            WebviewUrl::App("settings.html".into())
        )
        .title("Agent Player - Settings")
        .inner_size(700.0, 500.0)
        .resizable(true)
        .center()
        .build()?;

        Ok(())
    }

    /// Show about dialog
    fn show_about(app: &AppHandle) -> Result<()> {
        use tauri::WebviewUrl;

        if let Some(window) = app.get_webview_window("about") {
            window.set_focus()?;
            return Ok(());
        }

        tauri::WebviewWindowBuilder::new(
            app,
            "about",
            WebviewUrl::App("about.html".into())
        )
        .title("About Agent Player")
        .inner_size(500.0, 400.0)
        .resizable(false)
        .center()
        .build()?;

        Ok(())
    }

    /// Get service status
    pub fn get_service_status() -> Result<ServiceStatus> {
        let mut status = ServiceStatus {
            backend_running: false,
            frontend_running: false,
        };

        #[cfg(target_os = "linux")]
        {
            let backend_status = std::process::Command::new("systemctl")
                .args(["is-active", "agent-player.service"])
                .output()?;
            status.backend_running = String::from_utf8_lossy(&backend_status.stdout).trim() == "active";

            let frontend_status = std::process::Command::new("systemctl")
                .args(["is-active", "agent-player-frontend.service"])
                .output()?;
            status.frontend_running = String::from_utf8_lossy(&frontend_status.stdout).trim() == "active";
        }

        #[cfg(target_os = "windows")]
        {
            let backend_status = std::process::Command::new("sc")
                .args(["query", "AgentPlayerBackend"])
                .output()?;
            status.backend_running = String::from_utf8_lossy(&backend_status.stdout).contains("RUNNING");

            let frontend_status = std::process::Command::new("sc")
                .args(["query", "AgentPlayerFrontend"])
                .output()?;
            status.frontend_running = String::from_utf8_lossy(&frontend_status.stdout).contains("RUNNING");
        }

        Ok(status)
    }
}

/// Service status
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ServiceStatus {
    pub backend_running: bool,
    pub frontend_running: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_status_serialization() {
        let status = ServiceStatus {
            backend_running: true,
            frontend_running: true,
        };
        let json = serde_json::to_string(&status).unwrap();
        let deserialized: ServiceStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(status.backend_running, deserialized.backend_running);
    }
}
