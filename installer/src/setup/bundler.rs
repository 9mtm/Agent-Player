use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{Context, Result};

/// Installation directories structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationPaths {
    pub base_dir: PathBuf,
    pub runtime_dir: PathBuf,
    pub node_dir: PathBuf,
    pub python_dir: PathBuf,
    pub app_dir: PathBuf,
    pub data_dir: PathBuf,
}

impl InstallationPaths {
    /// Create new installation paths based on target directory
    pub fn new(base_dir: PathBuf) -> Self {
        let runtime_dir = base_dir.join("runtime");
        let node_dir = runtime_dir.join("node");
        let python_dir = runtime_dir.join("python");
        let app_dir = base_dir.join("app");
        let data_dir = base_dir.join(".data");

        Self {
            base_dir,
            runtime_dir,
            node_dir,
            python_dir,
            app_dir,
            data_dir,
        }
    }

    /// Get default installation directory based on OS
    pub fn default() -> Self {
        #[cfg(target_os = "windows")]
        let base_dir = {
            // Use %LOCALAPPDATA% to avoid needing admin privileges
            let local_app_data = std::env::var("LOCALAPPDATA")
                .unwrap_or_else(|_| String::from(r"C:\Users\Public\AppData\Local"));
            PathBuf::from(local_app_data).join("AgentPlayer")
        };

        #[cfg(target_os = "linux")]
        let base_dir = PathBuf::from("/opt/agent-player");

        #[cfg(target_os = "macos")]
        let base_dir = PathBuf::from("/Applications/Agent Player.app/Contents/Resources");

        Self::new(base_dir)
    }
}

/// Resource bundler for installing runtimes and application files
#[derive(Debug)]
pub struct ResourceBundler {
    paths: InstallationPaths,
}

impl ResourceBundler {
    /// Create new resource bundler
    pub fn new(paths: InstallationPaths) -> Self {
        Self { paths }
    }

    /// Create all necessary directories
    pub fn create_directories(&self) -> Result<()> {
        fs::create_dir_all(&self.paths.base_dir)
            .context("Failed to create base directory")?;

        fs::create_dir_all(&self.paths.runtime_dir)
            .context("Failed to create runtime directory")?;

        fs::create_dir_all(&self.paths.node_dir)
            .context("Failed to create Node.js directory")?;

        fs::create_dir_all(&self.paths.python_dir)
            .context("Failed to create Python directory")?;

        fs::create_dir_all(&self.paths.app_dir)
            .context("Failed to create application directory")?;

        fs::create_dir_all(&self.paths.data_dir)
            .context("Failed to create data directory")?;

        Ok(())
    }

    /// Check if runtimes are already extracted
    pub fn check_existing_runtimes(&self) -> RuntimeStatus {
        let node_exists = self.paths.node_dir.join("node").exists()
            || self.paths.node_dir.join("node.exe").exists();

        let python_exists = self.paths.python_dir.join("python").exists()
            || self.paths.python_dir.join("python.exe").exists();

        RuntimeStatus {
            node_installed: node_exists,
            python_installed: python_exists,
        }
    }

    /// Set file permissions (Unix only)
    #[cfg(unix)]
    pub fn set_permissions(&self) -> Result<()> {
        use std::os::unix::fs::PermissionsExt;

        // Set executable permissions for Node.js binary
        let node_binary = self.paths.node_dir.join("node");
        if node_binary.exists() {
            let mut perms = fs::metadata(&node_binary)?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&node_binary, perms)?;
        }

        // Set executable permissions for Python binary
        let python_binary = self.paths.python_dir.join("python");
        if python_binary.exists() {
            let mut perms = fs::metadata(&python_binary)?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&python_binary, perms)?;
        }

        // Set restrictive permissions for data directory (700 - owner only)
        let mut perms = fs::metadata(&self.paths.data_dir)?.permissions();
        perms.set_mode(0o700);
        fs::set_permissions(&self.paths.data_dir, perms)?;

        Ok(())
    }

    #[cfg(windows)]
    pub fn set_permissions(&self) -> Result<()> {
        // Windows permissions are handled differently
        // For now, just return Ok
        Ok(())
    }

    /// Extract Node.js runtime from embedded resources
    pub fn extract_nodejs_runtime(&self) -> Result<()> {
        // TODO: This will extract Node.js from embedded bytes
        // For now, we'll implement the structure and add the actual
        // extraction logic once we have the embedded resources

        // Check if Node.js is already installed
        let node_binary = if cfg!(windows) {
            self.paths.node_dir.join("node.exe")
        } else {
            self.paths.node_dir.join("node")
        };

        if node_binary.exists() {
            return Ok(()); // Already installed
        }

        // TODO: Extract embedded Node.js archive
        // let nodejs_archive = include_bytes!("../../../resources/nodejs.tar.gz");
        // extract_archive(nodejs_archive, &self.paths.node_dir)?;

        Ok(())
    }

    /// Extract Python environment from embedded resources
    pub fn extract_python_runtime(&self) -> Result<()> {
        // TODO: This will extract Python from embedded bytes
        // For now, we'll implement the structure and add the actual
        // extraction logic once we have the embedded resources

        // Check if Python is already installed
        let python_binary = if cfg!(windows) {
            self.paths.python_dir.join("python.exe")
        } else {
            self.paths.python_dir.join("python")
        };

        if python_binary.exists() {
            return Ok(()); // Already installed
        }

        // TODO: Extract embedded Python archive
        // let python_archive = include_bytes!("../../../resources/python.tar.gz");
        // extract_archive(python_archive, &self.paths.python_dir)?;

        Ok(())
    }

    /// Copy application files to installation directory
    pub fn copy_application_files(&self, source_dir: &Path) -> Result<()> {
        // Copy package.json
        let package_json = source_dir.join("package.json");
        if package_json.exists() {
            fs::copy(
                &package_json,
                self.paths.app_dir.join("package.json")
            ).context("Failed to copy package.json")?;
        }

        // Copy packages directory
        let packages_dir = source_dir.join("packages");
        if packages_dir.exists() {
            copy_dir_recursive(&packages_dir, &self.paths.app_dir.join("packages"))?;
        }

        // Copy src directory
        let src_dir = source_dir.join("src");
        if src_dir.exists() {
            copy_dir_recursive(&src_dir, &self.paths.app_dir.join("src"))?;
        }

        // Copy public directory
        let public_dir = source_dir.join("public");
        if public_dir.exists() {
            copy_dir_recursive(&public_dir, &self.paths.app_dir.join("public"))?;
        }

        // Copy configuration files
        for config_file in &["next.config.mjs", "tsconfig.json", ".env.example"] {
            let file_path = source_dir.join(config_file);
            if file_path.exists() {
                fs::copy(
                    &file_path,
                    self.paths.app_dir.join(config_file)
                ).context(format!("Failed to copy {}", config_file))?;
            }
        }

        Ok(())
    }

    /// Get installation progress callback
    pub fn get_installation_info(&self) -> InstallationInfo {
        InstallationInfo {
            base_dir: self.paths.base_dir.to_string_lossy().to_string(),
            total_size_mb: 900, // Approximate: Node.js (50MB) + Python (30MB) + App (800MB dependencies)
            steps: vec![
                InstallationStep {
                    name: "Create directories".to_string(),
                    progress: 0,
                    status: StepStatus::Pending,
                },
                InstallationStep {
                    name: "Extract Node.js runtime".to_string(),
                    progress: 0,
                    status: StepStatus::Pending,
                },
                InstallationStep {
                    name: "Extract Python environment".to_string(),
                    progress: 0,
                    status: StepStatus::Pending,
                },
                InstallationStep {
                    name: "Copy application files".to_string(),
                    progress: 0,
                    status: StepStatus::Pending,
                },
                InstallationStep {
                    name: "Set file permissions".to_string(),
                    progress: 0,
                    status: StepStatus::Pending,
                },
            ],
        }
    }
}

/// Runtime installation status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeStatus {
    pub node_installed: bool,
    pub python_installed: bool,
}

/// Installation progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationInfo {
    pub base_dir: String,
    pub total_size_mb: u64,
    pub steps: Vec<InstallationStep>,
}

/// Installation step details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationStep {
    pub name: String,
    pub progress: u8,
    pub status: StepStatus,
}

/// Step status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StepStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

/// Recursively copy a directory
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst).context("Failed to create destination directory")?;
    }

    for entry in fs::read_dir(src).context("Failed to read source directory")? {
        let entry = entry.context("Failed to read directory entry")?;
        let file_type = entry.file_type().context("Failed to get file type")?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .context(format!("Failed to copy file: {:?}", src_path))?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_installation_paths_creation() {
        let base = PathBuf::from("/test/path");
        let paths = InstallationPaths::new(base.clone());

        assert_eq!(paths.base_dir, base);
        assert_eq!(paths.runtime_dir, base.join("runtime"));
        assert_eq!(paths.node_dir, base.join("runtime").join("node"));
        assert_eq!(paths.python_dir, base.join("runtime").join("python"));
        assert_eq!(paths.app_dir, base.join("app"));
        assert_eq!(paths.data_dir, base.join(".data"));
    }

    #[test]
    fn test_default_paths_based_on_os() {
        let paths = InstallationPaths::default();

        #[cfg(target_os = "windows")]
        assert_eq!(paths.base_dir, PathBuf::from(r"C:\Program Files\AgentPlayer"));

        #[cfg(target_os = "linux")]
        assert_eq!(paths.base_dir, PathBuf::from("/opt/agent-player"));

        #[cfg(target_os = "macos")]
        assert_eq!(
            paths.base_dir,
            PathBuf::from("/Applications/Agent Player.app/Contents/Resources")
        );
    }
}
