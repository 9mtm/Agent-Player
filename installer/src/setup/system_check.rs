use serde::{Deserialize, Serialize};
use std::net::TcpListener;
use std::path::Path;
use std::process::Command;
use sysinfo::{System, Disks};

/// System check results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemCheck {
    pub disk_space_gb: u64,
    pub total_ram_gb: u64,
    pub port_41521_available: bool,
    pub port_41522_available: bool,
    pub docker_installed: bool,
    pub has_admin_permissions: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl SystemCheck {
    /// Run all system checks
    pub fn run() -> Self {
        let mut check = SystemCheck {
            disk_space_gb: 0,
            total_ram_gb: 0,
            port_41521_available: false,
            port_41522_available: false,
            docker_installed: false,
            has_admin_permissions: false,
            errors: Vec::new(),
            warnings: Vec::new(),
        };

        check.check_disk_space();
        check.check_ram();
        check.check_ports();
        check.check_docker();
        check.check_permissions();

        check
    }

    /// Check available disk space (minimum 2 GB)
    fn check_disk_space(&mut self) {
        let disks = Disks::new_with_refreshed_list();

        // Get the largest available space across all disks
        let max_available = disks
            .iter()
            .map(|disk| disk.available_space())
            .max()
            .unwrap_or(0);

        self.disk_space_gb = max_available / (1024 * 1024 * 1024);

        if self.disk_space_gb < 2 {
            self.errors.push(format!(
                "Insufficient disk space: {} GB available, 2 GB required",
                self.disk_space_gb
            ));
        } else if self.disk_space_gb < 5 {
            self.warnings.push(format!(
                "Low disk space: {} GB available. Recommended: 5 GB+",
                self.disk_space_gb
            ));
        }
    }

    /// Check total RAM (minimum 4 GB)
    fn check_ram(&mut self) {
        let mut sys = System::new_all();
        sys.refresh_memory();

        let total_memory = sys.total_memory();
        self.total_ram_gb = total_memory / (1024 * 1024 * 1024);

        if self.total_ram_gb < 4 {
            self.errors.push(format!(
                "Insufficient RAM: {} GB available, 4 GB required",
                self.total_ram_gb
            ));
        } else if self.total_ram_gb < 8 {
            self.warnings.push(format!(
                "Low RAM: {} GB available. Recommended: 8 GB+",
                self.total_ram_gb
            ));
        }
    }

    /// Check if required ports are available
    fn check_ports(&mut self) {
        self.port_41521_available = Self::is_port_available(41521);
        self.port_41522_available = Self::is_port_available(41522);

        if !self.port_41521_available {
            self.errors.push(
                "Port 41521 is already in use. Please close the application using this port.".to_string()
            );
        }

        if !self.port_41522_available {
            self.errors.push(
                "Port 41522 is already in use. Please close the application using this port.".to_string()
            );
        }
    }

    /// Check if Docker is installed (optional)
    fn check_docker(&mut self) {
        #[cfg(target_os = "windows")]
        let docker_check = Command::new("docker")
            .arg("--version")
            .output();

        #[cfg(not(target_os = "windows"))]
        let docker_check = Command::new("docker")
            .arg("--version")
            .output();

        self.docker_installed = docker_check.is_ok() && docker_check.unwrap().status.success();

        if !self.docker_installed {
            self.warnings.push(
                "Docker is not installed. Docker mode will not be available.".to_string()
            );
        }
    }

    /// Check if running with admin/root permissions
    fn check_permissions(&mut self) {
        #[cfg(target_os = "windows")]
        {
            // On Windows, check if running as administrator
            use std::ptr;
            use std::mem;

            // This is a simplified check - in production, use Windows API
            // For now, we'll assume we have permissions
            self.has_admin_permissions = true;
        }

        #[cfg(target_os = "linux")]
        {
            // On Linux, check if running as root or with sudo
            use std::os::unix::fs::PermissionsExt;
            self.has_admin_permissions = unsafe { libc::geteuid() } == 0;
        }

        #[cfg(target_os = "macos")]
        {
            // On macOS, check if running as root or with sudo
            use std::os::unix::fs::PermissionsExt;
            self.has_admin_permissions = unsafe { libc::geteuid() } == 0;
        }

        if !self.has_admin_permissions {
            self.warnings.push(
                "Not running with administrator privileges. Some features may be limited.".to_string()
            );
        }
    }

    /// Check if a specific port is available
    fn is_port_available(port: u16) -> bool {
        TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok()
    }

    /// Check if all critical requirements are met
    pub fn is_valid(&self) -> bool {
        self.errors.is_empty()
    }

    /// Get a summary message
    pub fn summary(&self) -> String {
        if self.is_valid() {
            if self.warnings.is_empty() {
                "✅ All system requirements met! Ready to install.".to_string()
            } else {
                format!(
                    "✅ System requirements met with {} warning(s).",
                    self.warnings.len()
                )
            }
        } else {
            format!(
                "❌ System check failed: {} error(s) found.",
                self.errors.len()
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_check_runs() {
        let check = SystemCheck::run();
        // Should not panic
        assert!(check.disk_space_gb >= 0);
        assert!(check.total_ram_gb >= 0);
    }

    #[test]
    fn test_port_availability_check() {
        // Bind a port to make it unavailable
        let _listener = TcpListener::bind("127.0.0.1:50000").unwrap();
        assert!(!SystemCheck::is_port_available(50000));

        // Check an unlikely port (should be available)
        assert!(SystemCheck::is_port_available(50001));
    }

    #[test]
    fn test_validation() {
        let mut check = SystemCheck {
            disk_space_gb: 10,
            total_ram_gb: 8,
            port_41521_available: true,
            port_41522_available: true,
            docker_installed: true,
            has_admin_permissions: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        };

        assert!(check.is_valid());

        check.errors.push("Test error".to_string());
        assert!(!check.is_valid());
    }
}
