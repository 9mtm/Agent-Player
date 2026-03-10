// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod setup;
mod deployment;
mod services;

use setup::{SystemCheck, ResourceBundler, InstallationPaths, InstallationInfo};
use deployment::{
    DockerDeployment, DockerStatus,
    DirectDeployment, DirectStatus, ServiceConfig,
    ServerDeployment, ServerConfig, ServerStatus, SshAuth
};
use services::{
    SystemTrayService, LogsService, UpdaterService, UpdateInfo, UninstallerService
};
use tauri::Manager;
use std::path::PathBuf;

/// Tauri command: Run system check
#[tauri::command]
fn run_system_check() -> SystemCheck {
    SystemCheck::run()
}

/// Tauri command: Get default installation directory
#[tauri::command]
fn get_default_install_dir() -> String {
    let paths = InstallationPaths::default();
    paths.base_dir.to_string_lossy().to_string()
}

/// Tauri command: Create installation directories
#[tauri::command]
fn create_install_directories(install_dir: String) -> Result<(), String> {
    let paths = InstallationPaths::new(PathBuf::from(install_dir));
    let bundler = ResourceBundler::new(paths);

    bundler.create_directories()
        .map_err(|e| format!("Failed to create directories: {}", e))
}

/// Tauri command: Get installation info
#[tauri::command]
fn get_installation_info(install_dir: String) -> InstallationInfo {
    let paths = InstallationPaths::new(PathBuf::from(install_dir));
    let bundler = ResourceBundler::new(paths);
    bundler.get_installation_info()
}

/// Tauri command: Check existing runtimes
#[tauri::command]
fn check_existing_runtimes(install_dir: String) -> Result<serde_json::Value, String> {
    let paths = InstallationPaths::new(PathBuf::from(install_dir));
    let bundler = ResourceBundler::new(paths);
    let status = bundler.check_existing_runtimes();

    Ok(serde_json::json!({
        "node_installed": status.node_installed,
        "python_installed": status.python_installed
    }))
}

/// Tauri command: Check Docker installation
#[tauri::command]
fn check_docker() -> DockerStatus {
    DockerDeployment::check_docker_installed()
}

/// Tauri command: Build Docker images
#[tauri::command]
fn docker_build(install_dir: String) -> Result<(), String> {
    let deployment = DockerDeployment::new(install_dir);
    deployment.build_images()
        .map_err(|e| format!("Docker build failed: {}", e))
}

/// Tauri command: Start Docker containers
#[tauri::command]
fn docker_start(install_dir: String) -> Result<(), String> {
    let deployment = DockerDeployment::new(install_dir);
    deployment.start_containers()
        .map_err(|e| format!("Failed to start containers: {}", e))
}

/// Tauri command: Stop Docker containers
#[tauri::command]
fn docker_stop(install_dir: String) -> Result<(), String> {
    let deployment = DockerDeployment::new(install_dir);
    deployment.stop_containers()
        .map_err(|e| format!("Failed to stop containers: {}", e))
}

/// Tauri command: Check Docker health
#[tauri::command]
fn docker_health(install_dir: String) -> Result<DockerStatus, String> {
    let deployment = DockerDeployment::new(install_dir);
    deployment.check_health()
        .map_err(|e| format!("Failed to check health: {}", e))
}

/// Tauri command: Get Docker logs
#[tauri::command]
fn docker_logs(install_dir: String, service: String, tail: usize) -> Result<String, String> {
    let deployment = DockerDeployment::new(install_dir);
    deployment.get_logs(&service, tail)
        .map_err(|e| format!("Failed to get logs: {}", e))
}

/// Tauri command: Install dependencies (Direct mode)
#[tauri::command]
fn direct_install_dependencies(install_dir: String) -> Result<(), String> {
    let deployment = DirectDeployment::new(PathBuf::from(install_dir));
    deployment.install_dependencies()
        .map_err(|e| format!("Failed to install dependencies: {}", e))
}

/// Tauri command: Build production (Direct mode)
#[tauri::command]
fn direct_build_production(install_dir: String) -> Result<(), String> {
    let deployment = DirectDeployment::new(PathBuf::from(install_dir));
    deployment.build_production()
        .map_err(|e| format!("Failed to build production: {}", e))
}

/// Tauri command: Install system service (Direct mode)
#[tauri::command]
fn direct_install_service(install_dir: String, frontend_port: u16, backend_port: u16, auto_start: bool) -> Result<(), String> {
    let deployment = DirectDeployment::new(PathBuf::from(install_dir));
    let config = ServiceConfig {
        frontend_port,
        backend_port,
        auto_start,
    };
    deployment.install_service(&config)
        .map_err(|e| format!("Failed to install service: {}", e))
}

/// Tauri command: Start services (Direct mode)
#[tauri::command]
fn direct_start_services(install_dir: String) -> Result<(), String> {
    let deployment = DirectDeployment::new(PathBuf::from(install_dir));
    deployment.start_services()
        .map_err(|e| format!("Failed to start services: {}", e))
}

/// Tauri command: Stop services (Direct mode)
#[tauri::command]
fn direct_stop_services(install_dir: String) -> Result<(), String> {
    let deployment = DirectDeployment::new(PathBuf::from(install_dir));
    deployment.stop_services()
        .map_err(|e| format!("Failed to stop services: {}", e))
}

/// Tauri command: Check Direct mode status
#[tauri::command]
fn direct_check_status(install_dir: String) -> Result<DirectStatus, String> {
    let deployment = DirectDeployment::new(PathBuf::from(install_dir));
    deployment.check_status()
        .map_err(|e| format!("Failed to check status: {}", e))
}

/// Tauri command: Test server SSH connection (Server mode)
#[tauri::command]
fn server_test_connection(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.test_connection()
        .map_err(|e| format!("Connection test failed: {}", e))
}

/// Tauri command: Check server requirements (Server mode)
#[tauri::command]
fn server_check_requirements(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.check_server_requirements()
        .map_err(|e| format!("Requirements check failed: {}", e))
}

/// Tauri command: Install server dependencies (Server mode)
#[tauri::command]
fn server_install_dependencies(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.install_dependencies()
        .map_err(|e| format!("Failed to install dependencies: {}", e))
}

/// Tauri command: Upload files to server (Server mode)
#[tauri::command]
fn server_upload_files(config_json: String, source_dir: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.upload_files(&PathBuf::from(source_dir))
        .map_err(|e| format!("Failed to upload files: {}", e))
}

/// Tauri command: Build production on server (Server mode)
#[tauri::command]
fn server_build_production(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.build_production()
        .map_err(|e| format!("Failed to build production: {}", e))
}

/// Tauri command: Configure systemd services on server (Server mode)
#[tauri::command]
fn server_configure_systemd(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.configure_systemd()
        .map_err(|e| format!("Failed to configure systemd: {}", e))
}

/// Tauri command: Configure nginx on server (Server mode)
#[tauri::command]
fn server_configure_nginx(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.configure_nginx()
        .map_err(|e| format!("Failed to configure nginx: {}", e))
}

/// Tauri command: Setup SSL on server (Server mode)
#[tauri::command]
fn server_setup_ssl(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.setup_ssl()
        .map_err(|e| format!("Failed to setup SSL: {}", e))
}

/// Tauri command: Configure firewall on server (Server mode)
#[tauri::command]
fn server_configure_firewall(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.configure_firewall()
        .map_err(|e| format!("Failed to configure firewall: {}", e))
}

/// Tauri command: Start services on server (Server mode)
#[tauri::command]
fn server_start_services(config_json: String) -> Result<(), String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.start_services()
        .map_err(|e| format!("Failed to start services: {}", e))
}

/// Tauri command: Check server deployment status (Server mode)
#[tauri::command]
fn server_check_status(config_json: String) -> Result<ServerStatus, String> {
    let config: ServerConfig = serde_json::from_str(&config_json)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let deployment = ServerDeployment::new(config);
    deployment.check_status()
        .map_err(|e| format!("Failed to check status: {}", e))
}

// ==================== Phase 6: Post-Install Management Commands ====================

/// Tauri command: Get logs for a service
#[tauri::command]
fn get_logs(service: String, tail: usize, level: String) -> Result<String, String> {
    let log_level = match level.as_str() {
        "info" => services::logs::LogLevel::Info,
        "warn" => services::logs::LogLevel::Warn,
        "error" => services::logs::LogLevel::Error,
        _ => services::logs::LogLevel::All,
    };

    let entries = LogsService::get_logs(&service, tail, log_level)
        .map_err(|e| format!("Failed to get logs: {}", e))?;

    // Convert to JSON string
    serde_json::to_string(&entries)
        .map_err(|e| format!("Failed to serialize logs: {}", e))
}

/// Tauri command: Export logs to file
#[tauri::command]
fn export_logs(service: String, output_path: String) -> Result<(), String> {
    LogsService::export_logs(&service, &PathBuf::from(output_path))
        .map_err(|e| format!("Failed to export logs: {}", e))
}

/// Tauri command: Check for updates
#[tauri::command]
async fn check_for_updates() -> Result<Option<String>, String> {
    match UpdaterService::check_for_updates().await {
        Ok(Some(info)) => {
            // Return JSON string of update info
            serde_json::to_string(&info)
                .map(Some)
                .map_err(|e| format!("Failed to serialize update info: {}", e))
        },
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to check for updates: {}", e))
    }
}

/// Tauri command: Download update
#[tauri::command]
async fn download_update(url: String, output_path: String) -> Result<(), String> {
    UpdaterService::download_update(&url, &PathBuf::from(output_path))
        .await
        .map_err(|e| format!("Failed to download update: {}", e))
}

/// Tauri command: Install update
#[tauri::command]
fn install_update(installer_path: String) -> Result<(), String> {
    UpdaterService::install_update(&PathBuf::from(installer_path))
        .map_err(|e| format!("Failed to install update: {}", e))
}

/// Tauri command: Get space to be freed by uninstall
#[tauri::command]
fn get_uninstall_space(options_json: String) -> Result<u64, String> {
    let options: services::uninstaller::UninstallOptions = serde_json::from_str(&options_json)
        .map_err(|e| format!("Invalid uninstall options: {}", e))?;

    UninstallerService::get_space_to_free(&options)
        .map_err(|e| format!("Failed to calculate space: {}", e))
}

/// Tauri command: Create backup before uninstall
#[tauri::command]
fn create_uninstall_backup(backup_path: String) -> Result<(), String> {
    UninstallerService::create_backup(&PathBuf::from(backup_path))
        .map_err(|e| format!("Failed to create backup: {}", e))
}

/// Tauri command: Uninstall Agent Player
#[tauri::command]
fn uninstall_agent_player(options_json: String) -> Result<(), String> {
    let options: services::uninstaller::UninstallOptions = serde_json::from_str(&options_json)
        .map_err(|e| format!("Invalid uninstall options: {}", e))?;

    UninstallerService::uninstall(options)
        .map_err(|e| format!("Uninstallation failed: {}", e))
}

/// Tauri command: Open dashboard in browser
#[tauri::command]
fn open_dashboard() -> Result<(), String> {
    SystemTrayService::open_dashboard()
        .map_err(|e| format!("Failed to open dashboard: {}", e))
}

/// Tauri command: Get service status for tray
#[tauri::command]
fn get_service_status() -> Result<String, String> {
    SystemTrayService::get_service_status()
        .map_err(|e| format!("Failed to get status: {}", e))
}

/// Tauri command: Start services from tray
#[tauri::command]
fn tray_start_services() -> Result<(), String> {
    SystemTrayService::start_services()
        .map_err(|e| format!("Failed to start services: {}", e))
}

/// Tauri command: Stop services from tray
#[tauri::command]
fn tray_stop_services() -> Result<(), String> {
    SystemTrayService::stop_services()
        .map_err(|e| format!("Failed to stop services: {}", e))
}

/// Tauri command: Restart services from tray
#[tauri::command]
fn tray_restart_services() -> Result<(), String> {
    SystemTrayService::restart_services()
        .map_err(|e| format!("Failed to restart services: {}", e))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("Agent Player Setup - Step 2 of 8: System Check")?;

            // Initialize system tray (Phase 6)
            // Note: System tray will be visible after installation completes
            if let Err(e) = SystemTrayService::initialize(app.handle()) {
                eprintln!("Warning: Failed to initialize system tray: {}", e);
                // Don't fail setup if tray initialization fails
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Setup commands
            run_system_check,
            get_default_install_dir,
            create_install_directories,
            get_installation_info,
            check_existing_runtimes,
            // Docker mode commands
            check_docker,
            docker_build,
            docker_start,
            docker_stop,
            docker_health,
            docker_logs,
            // Direct mode commands
            direct_install_dependencies,
            direct_build_production,
            direct_install_service,
            direct_start_services,
            direct_stop_services,
            direct_check_status,
            // Server mode commands
            server_test_connection,
            server_check_requirements,
            server_install_dependencies,
            server_upload_files,
            server_build_production,
            server_configure_systemd,
            server_configure_nginx,
            server_setup_ssl,
            server_configure_firewall,
            server_start_services,
            server_check_status,
            // Post-install management commands (Phase 6)
            get_logs,
            export_logs,
            check_for_updates,
            download_update,
            install_update,
            get_uninstall_space,
            create_uninstall_backup,
            uninstall_agent_player,
            open_dashboard,
            get_service_status,
            tray_start_services,
            tray_stop_services,
            tray_restart_services
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
