use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use anyhow::{Context, Result};

/// Uninstall options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UninstallOptions {
    pub remove_data: bool,
    pub remove_config: bool,
    pub remove_logs: bool,
    pub remove_docker_volumes: bool,
}

/// Uninstaller service
pub struct UninstallerService;

impl UninstallerService {
    /// Uninstall Agent Player
    pub fn uninstall(options: UninstallOptions) -> Result<()> {
        println!("Starting uninstallation...");

        // Stop services
        println!("Stopping services...");
        Self::stop_all_services()?;

        // Remove services
        println!("Removing services...");
        Self::remove_services()?;

        // Remove application files
        println!("Removing application files...");
        Self::remove_application_files()?;

        // Remove data if requested
        if options.remove_data {
            println!("Removing user data...");
            Self::remove_data_directory()?;
        }

        // Remove config if requested
        if options.remove_config {
            println!("Removing configuration...");
            Self::remove_config_files()?;
        }

        // Remove logs if requested
        if options.remove_logs {
            println!("Removing logs...");
            Self::remove_log_files()?;
        }

        // Remove Docker volumes if requested
        if options.remove_docker_volumes {
            println!("Removing Docker volumes...");
            Self::remove_docker_volumes()?;
        }

        // Clean up registry/shortcuts
        #[cfg(target_os = "windows")]
        {
            println!("Cleaning up Windows registry...");
            Self::cleanup_windows_registry()?;
        }

        println!("Uninstallation completed successfully");

        Ok(())
    }

    /// Stop all services
    fn stop_all_services() -> Result<()> {
        #[cfg(target_os = "linux")]
        {
            Command::new("systemctl")
                .args(["stop", "agent-player.service"])
                .output()
                .ok();
            Command::new("systemctl")
                .args(["stop", "agent-player-frontend.service"])
                .output()
                .ok();
        }

        #[cfg(target_os = "macos")]
        {
            Command::new("launchctl")
                .args(["stop", "com.agentplayer.backend"])
                .output()
                .ok();
            Command::new("launchctl")
                .args(["stop", "com.agentplayer.frontend"])
                .output()
                .ok();
        }

        #[cfg(target_os = "windows")]
        {
            Command::new("sc")
                .args(["stop", "AgentPlayerBackend"])
                .output()
                .ok();
            Command::new("sc")
                .args(["stop", "AgentPlayerFrontend"])
                .output()
                .ok();
        }

        // Wait for services to stop
        std::thread::sleep(std::time::Duration::from_secs(3));

        Ok(())
    }

    /// Remove system services
    fn remove_services() -> Result<()> {
        #[cfg(target_os = "linux")]
        {
            Command::new("systemctl")
                .args(["disable", "agent-player.service"])
                .output()
                .ok();
            Command::new("systemctl")
                .args(["disable", "agent-player-frontend.service"])
                .output()
                .ok();

            fs::remove_file("/etc/systemd/system/agent-player.service").ok();
            fs::remove_file("/etc/systemd/system/agent-player-frontend.service").ok();

            Command::new("systemctl")
                .arg("daemon-reload")
                .output()
                .ok();
        }

        #[cfg(target_os = "macos")]
        {
            Command::new("launchctl")
                .args(["unload", "/Library/LaunchDaemons/com.agentplayer.backend.plist"])
                .output()
                .ok();
            Command::new("launchctl")
                .args(["unload", "/Library/LaunchDaemons/com.agentplayer.frontend.plist"])
                .output()
                .ok();

            fs::remove_file("/Library/LaunchDaemons/com.agentplayer.backend.plist").ok();
            fs::remove_file("/Library/LaunchDaemons/com.agentplayer.frontend.plist").ok();
        }

        #[cfg(target_os = "windows")]
        {
            Command::new("sc")
                .args(["delete", "AgentPlayerBackend"])
                .output()
                .ok();
            Command::new("sc")
                .args(["delete", "AgentPlayerFrontend"])
                .output()
                .ok();
        }

        Ok(())
    }

    /// Remove application files
    fn remove_application_files() -> Result<()> {
        let install_dir = Self::get_install_dir();

        if install_dir.exists() {
            fs::remove_dir_all(&install_dir)
                .context("Failed to remove installation directory")?;
        }

        Ok(())
    }

    /// Remove data directory
    fn remove_data_directory() -> Result<()> {
        let data_dirs = vec![
            Self::get_install_dir().join(".data"),
            Self::get_install_dir().join("public/storage"),
        ];

        for dir in data_dirs {
            if dir.exists() {
                fs::remove_dir_all(&dir)
                    .context(format!("Failed to remove {:?}", dir))?;
            }
        }

        Ok(())
    }

    /// Remove configuration files
    fn remove_config_files() -> Result<()> {
        let config_files = vec![
            Self::get_install_dir().join(".env"),
            Self::get_install_dir().join("docker-compose.yml"),
        ];

        for file in config_files {
            if file.exists() {
                fs::remove_file(&file)
                    .context(format!("Failed to remove {:?}", file))?;
            }
        }

        Ok(())
    }

    /// Remove log files
    fn remove_log_files() -> Result<()> {
        let log_dir = Self::get_install_dir().join("logs");

        if log_dir.exists() {
            fs::remove_dir_all(&log_dir)
                .context("Failed to remove logs directory")?;
        }

        Ok(())
    }

    /// Remove Docker volumes
    fn remove_docker_volumes() -> Result<()> {
        // Check if Docker is available
        let docker_available = Command::new("docker")
            .arg("--version")
            .output()
            .is_ok();

        if !docker_available {
            return Ok(());
        }

        // Remove volumes
        Command::new("docker")
            .args(["volume", "rm", "agent-player-data"])
            .output()
            .ok();

        Command::new("docker")
            .args(["volume", "rm", "agent-player-public"])
            .output()
            .ok();

        // Remove images
        Command::new("docker")
            .args(["rmi", "agent-player-frontend"])
            .output()
            .ok();

        Command::new("docker")
            .args(["rmi", "agent-player-backend"])
            .output()
            .ok();

        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn cleanup_windows_registry() -> Result<()> {
        // Remove uninstall entry
        Command::new("reg")
            .args([
                "delete",
                "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\AgentPlayer",
                "/f",
            ])
            .output()
            .ok();

        // Remove start menu shortcuts
        let start_menu = PathBuf::from(std::env::var("PROGRAMDATA").unwrap_or_default())
            .join("Microsoft\\Windows\\Start Menu\\Programs\\Agent Player");

        if start_menu.exists() {
            fs::remove_dir_all(&start_menu).ok();
        }

        Ok(())
    }

    /// Get installation directory
    fn get_install_dir() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            PathBuf::from("C:\\Program Files\\AgentPlayer")
        }

        #[cfg(target_os = "linux")]
        {
            PathBuf::from("/opt/agent-player")
        }

        #[cfg(target_os = "macos")]
        {
            PathBuf::from("/Applications/Agent Player.app/Contents/Resources")
        }
    }

    /// Get estimated disk space to be freed
    pub fn get_space_to_free(options: &UninstallOptions) -> Result<u64> {
        let mut total_size = 0u64;

        // Application files
        total_size += Self::get_directory_size(&Self::get_install_dir())?;

        // Data directory
        if options.remove_data {
            total_size += Self::get_directory_size(&Self::get_install_dir().join(".data"))?;
            total_size += Self::get_directory_size(&Self::get_install_dir().join("public/storage"))?;
        }

        // Logs
        if options.remove_logs {
            total_size += Self::get_directory_size(&Self::get_install_dir().join("logs"))?;
        }

        Ok(total_size)
    }

    /// Get directory size
    fn get_directory_size(path: &Path) -> Result<u64> {
        if !path.exists() {
            return Ok(0);
        }

        let mut size = 0u64;

        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let metadata = entry.metadata()?;

            if metadata.is_file() {
                size += metadata.len();
            } else if metadata.is_dir() {
                size += Self::get_directory_size(&entry.path())?;
            }
        }

        Ok(size)
    }

    /// Create backup before uninstall
    pub fn create_backup(backup_path: &Path) -> Result<()> {
        println!("Creating backup at {:?}...", backup_path);

        let install_dir = Self::get_install_dir();
        let data_dir = install_dir.join(".data");

        if !data_dir.exists() {
            return Ok(());
        }

        // Create backup directory
        fs::create_dir_all(backup_path)?;

        // Copy database
        let db_file = data_dir.join("agent-player.db");
        if db_file.exists() {
            fs::copy(&db_file, backup_path.join("agent-player.db"))?;
        }

        // Copy .env
        let env_file = install_dir.join(".env");
        if env_file.exists() {
            fs::copy(&env_file, backup_path.join(".env"))?;
        }

        println!("Backup created successfully");

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_uninstall_options_serialization() {
        let options = UninstallOptions {
            remove_data: true,
            remove_config: true,
            remove_logs: false,
            remove_docker_volumes: true,
        };

        let json = serde_json::to_string(&options).unwrap();
        let deserialized: UninstallOptions = serde_json::from_str(&json).unwrap();
        assert_eq!(options.remove_data, deserialized.remove_data);
    }
}
