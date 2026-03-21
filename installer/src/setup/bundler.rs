use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use anyhow::{anyhow, Context, Result};

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

    /// Copy application files to installation directory (FULL INSTALL - Option A)
    pub fn copy_application_files(&self, source_dir: &Path) -> Result<()> {
        println!("[Bundler] 📂 Copying Agent Player files from: {}", source_dir.display());
        println!("[Bundler] 📂 To: {}", self.paths.base_dir.display());

        // Exclude these folders (we'll install dependencies later)
        let exclude = vec![
            "node_modules",
            ".next",
            ".data",
            ".git",
            "target",
            "installer",
            ".cache",
            "dist",
            ".turbo"
        ];

        // Copy everything except excluded folders
        copy_dir_recursive_filtered(source_dir, &self.paths.base_dir, &exclude)?;

        println!("[Bundler] ✅ Application files copied successfully");
        Ok(())
    }

    /// Install dependencies using pnpm
    pub fn install_dependencies(&self) -> Result<()> {
        use std::process::Command;

        println!("[Bundler] 📦 Installing dependencies (this may take 2-3 minutes)...");

        // Install backend dependencies
        println!("[Bundler] 📦 Installing backend dependencies...");
        let backend_dir = self.paths.base_dir.join("packages").join("backend");
        let backend_status = Command::new("pnpm")
            .args(&["install", "--prod"])
            .current_dir(&backend_dir)
            .status()
            .context("Failed to run pnpm install for backend")?;

        if !backend_status.success() {
            return Err(anyhow!("pnpm install failed for backend"));
        }

        // Install frontend dependencies
        println!("[Bundler] 📦 Installing frontend dependencies...");
        let frontend_status = Command::new("pnpm")
            .args(&["install", "--prod"])
            .current_dir(&self.paths.base_dir)
            .status()
            .context("Failed to run pnpm install for frontend")?;

        if !frontend_status.success() {
            return Err(anyhow!("pnpm install failed for frontend"));
        }

        println!("[Bundler] ✅ Dependencies installed successfully");
        Ok(())
    }

    /// Build production version (optional - for production deployment)
    pub fn build_production(&self) -> Result<()> {
        use std::process::Command;

        println!("[Bundler] 🏗️  Building production version...");

        // Build backend
        println!("[Bundler] 🏗️  Building backend...");
        let backend_dir = self.paths.base_dir.join("packages").join("backend");
        let backend_status = Command::new("pnpm")
            .args(&["build"])
            .current_dir(&backend_dir)
            .status()
            .context("Failed to build backend")?;

        if !backend_status.success() {
            return Err(anyhow!("Backend build failed"));
        }

        // Build frontend
        println!("[Bundler] 🏗️  Building frontend...");
        let frontend_status = Command::new("pnpm")
            .args(&["build"])
            .current_dir(&self.paths.base_dir)
            .status()
            .context("Failed to build frontend")?;

        if !frontend_status.success() {
            return Err(anyhow!("Frontend build failed"));
        }

        println!("[Bundler] ✅ Production build completed successfully");
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

    /// Download and extract Agent Player files from GitHub Releases (Option 2 - Web Installer)
    pub async fn download_and_extract_from_github(&self, version: &str) -> Result<()> {
        use futures_util::StreamExt;
        use std::io::Write;

        println!("[Bundler] 🌐 Downloading Agent Player v{} from GitHub...", version);

        let url = format!(
            "https://github.com/9mtm/Agent-Player/releases/download/{}/agent-player-files.zip",
            version
        );

        // Create HTTP client with 5-minute timeout
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .context("Failed to create HTTP client")?;

        // Start download
        let response = client
            .get(&url)
            .send()
            .await
            .context("Failed to download from GitHub")?;

        if !response.status().is_success() {
            return Err(anyhow!("Failed to download: HTTP {}", response.status()));
        }

        // Get content length for progress tracking
        let total_size = response.content_length().unwrap_or(0);
        println!("[Bundler] 📦 File size: {} MB", total_size / 1_000_000);

        // Create temp file for download
        let temp_dir = std::env::temp_dir();
        let temp_file_path = temp_dir.join(format!("agent-player-{}.zip", version));
        let mut temp_file = fs::File::create(&temp_file_path)
            .context("Failed to create temporary file")?;

        // Download with progress tracking
        let mut downloaded: u64 = 0;
        let mut stream = response.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.context("Error while downloading file")?;
            temp_file
                .write_all(&chunk)
                .context("Failed to write to temporary file")?;

            downloaded += chunk.len() as u64;

            // Print progress every 10MB
            if downloaded % 10_000_000 < chunk.len() as u64 {
                let percent = (downloaded as f64 / total_size as f64 * 100.0) as u32;
                println!(
                    "[Bundler] ⬇️  Downloaded: {} MB / {} MB ({}%)",
                    downloaded / 1_000_000,
                    total_size / 1_000_000,
                    percent
                );
            }
        }

        println!("[Bundler] ✅ Download complete: {}", temp_file_path.display());

        // Extract ZIP to installation directory
        println!("[Bundler] 📂 Extracting files to: {}", self.paths.base_dir.display());

        let zip_file = fs::File::open(&temp_file_path)
            .context("Failed to open downloaded ZIP file")?;

        let mut archive = zip::ZipArchive::new(zip_file)
            .context("Failed to read ZIP archive")?;

        let total_files = archive.len();
        println!("[Bundler] 📄 Extracting {} files...", total_files);

        for i in 0..total_files {
            let mut file = archive.by_index(i)
                .context(format!("Failed to access file {} in archive", i))?;

            let outpath = match file.enclosed_name() {
                Some(path) => self.paths.base_dir.join(path),
                None => continue,
            };

            // Create directory if needed
            if file.name().ends_with('/') {
                fs::create_dir_all(&outpath)
                    .context(format!("Failed to create directory: {:?}", outpath))?;
            } else {
                // Create parent directory
                if let Some(parent) = outpath.parent() {
                    fs::create_dir_all(parent)
                        .context(format!("Failed to create parent directory: {:?}", parent))?;
                }

                // Extract file
                let mut outfile = fs::File::create(&outpath)
                    .context(format!("Failed to create file: {:?}", outpath))?;

                std::io::copy(&mut file, &mut outfile)
                    .context(format!("Failed to extract file: {:?}", outpath))?;
            }

            // Print progress every 100 files
            if i % 100 == 0 {
                let percent = ((i + 1) as f64 / total_files as f64 * 100.0) as u32;
                println!("[Bundler] 📦 Extracted: {} / {} files ({}%)", i + 1, total_files, percent);
            }
        }

        println!("[Bundler] ✅ All files extracted successfully");

        // Clean up temporary file
        fs::remove_file(&temp_file_path)
            .context("Failed to delete temporary ZIP file")?;

        println!("[Bundler] 🧹 Cleaned up temporary files");

        Ok(())
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

/// Recursively copy directory with filtering (exclude specific folders)
fn copy_dir_recursive_filtered(src: &Path, dst: &Path, exclude: &[&str]) -> Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst).context("Failed to create destination directory")?;
    }

    for entry in fs::read_dir(src).context("Failed to read source directory")? {
        let entry = entry.context("Failed to read directory entry")?;
        let file_name = entry.file_name();
        let file_name_str = file_name.to_string_lossy();

        // Skip excluded folders
        if exclude.contains(&file_name_str.as_ref()) {
            println!("[Bundler] ⏭️  Skipping: {}", file_name_str);
            continue;
        }

        let file_type = entry.file_type().context("Failed to get file type")?;
        let src_path = entry.path();
        let dst_path = dst.join(&file_name);

        if file_type.is_dir() {
            copy_dir_recursive_filtered(&src_path, &dst_path, exclude)?;
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
