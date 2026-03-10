use serde::{Deserialize, Serialize};
use reqwest;
use anyhow::{Context, Result};
use std::cmp::Ordering;

/// Current version
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

/// Update information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub release_notes: String,
    pub download_url: String,
    pub published_at: String,
    pub size: u64,
}

/// GitHub release response
#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    name: String,
    body: String,
    published_at: String,
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

/// Auto-updater service
pub struct UpdaterService;

impl UpdaterService {
    /// Check for updates from GitHub releases
    pub async fn check_for_updates() -> Result<Option<UpdateInfo>> {
        println!("Checking for updates...");

        let url = "https://api.github.com/repos/Agent-Player/Agent-Player/releases/latest";

        let client = reqwest::Client::builder()
            .user_agent("Agent-Player-Installer")
            .build()?;

        let response = client
            .get(url)
            .send()
            .await
            .context("Failed to fetch release information")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("GitHub API returned error: {}", response.status()));
        }

        let release: GitHubRelease = response
            .json()
            .await
            .context("Failed to parse release JSON")?;

        // Parse version from tag (e.g., "v1.3.0" -> "1.3.0")
        let latest_version = release.tag_name.trim_start_matches('v');

        // Compare versions
        match Self::compare_versions(CURRENT_VERSION, latest_version) {
            Ordering::Less => {
                // Update available
                let asset = Self::get_platform_asset(&release.assets)?;

                Ok(Some(UpdateInfo {
                    version: latest_version.to_string(),
                    release_notes: release.body,
                    download_url: asset.browser_download_url,
                    published_at: release.published_at,
                    size: asset.size,
                }))
            }
            Ordering::Equal | Ordering::Greater => {
                // Already up to date
                println!("Already running latest version: {}", CURRENT_VERSION);
                Ok(None)
            }
        }
    }

    /// Compare semantic versions (simple implementation)
    fn compare_versions(current: &str, latest: &str) -> Ordering {
        let current_parts: Vec<u32> = current
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect();

        let latest_parts: Vec<u32> = latest
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect();

        for i in 0..3 {
            let current_part = current_parts.get(i).unwrap_or(&0);
            let latest_part = latest_parts.get(i).unwrap_or(&0);

            match current_part.cmp(latest_part) {
                Ordering::Less => return Ordering::Less,
                Ordering::Greater => return Ordering::Greater,
                Ordering::Equal => continue,
            }
        }

        Ordering::Equal
    }

    /// Get download asset for current platform
    fn get_platform_asset(assets: &[GitHubAsset]) -> Result<&GitHubAsset> {
        let platform_suffix = if cfg!(target_os = "windows") {
            "win-x64.msi"
        } else if cfg!(target_os = "macos") {
            "macos-universal.dmg"
        } else if cfg!(target_os = "linux") {
            "linux-x86_64.AppImage"
        } else {
            return Err(anyhow::anyhow!("Unsupported platform"));
        };

        assets
            .iter()
            .find(|asset| asset.name.ends_with(platform_suffix))
            .ok_or_else(|| anyhow::anyhow!("No installer found for current platform"))
    }

    /// Download update
    pub async fn download_update(url: &str, output_path: &std::path::Path) -> Result<()> {
        println!("Downloading update from {}...", url);

        let client = reqwest::Client::builder()
            .user_agent("Agent-Player-Installer")
            .build()?;

        let response = client
            .get(url)
            .send()
            .await
            .context("Failed to download update")?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Download failed: {}", response.status()));
        }

        let bytes = response
            .bytes()
            .await
            .context("Failed to read download")?;

        std::fs::write(output_path, bytes)
            .context("Failed to write installer")?;

        println!("Update downloaded to {:?}", output_path);

        Ok(())
    }

    /// Install update
    pub fn install_update(installer_path: &std::path::Path) -> Result<()> {
        println!("Installing update...");

        #[cfg(target_os = "windows")]
        {
            // Run MSI installer
            std::process::Command::new("msiexec")
                .args(["/i", installer_path.to_str().unwrap(), "/qb"])
                .spawn()
                .context("Failed to start installer")?;
        }

        #[cfg(target_os = "macos")]
        {
            // Open DMG
            std::process::Command::new("open")
                .arg(installer_path)
                .spawn()
                .context("Failed to open installer")?;
        }

        #[cfg(target_os = "linux")]
        {
            // Run AppImage
            std::process::Command::new("chmod")
                .args(["+x", installer_path.to_str().unwrap()])
                .output()?;

            std::process::Command::new(installer_path)
                .spawn()
                .context("Failed to start installer")?;
        }

        // Exit current application
        std::process::exit(0);
    }

    /// Get current version
    pub fn get_current_version() -> String {
        CURRENT_VERSION.to_string()
    }

    /// Check if auto-update is enabled
    pub fn is_auto_update_enabled() -> bool {
        // Read from config file or environment variable
        std::env::var("AGENT_PLAYER_AUTO_UPDATE")
            .unwrap_or_else(|_| "true".to_string())
            == "true"
    }

    /// Format file size
    pub fn format_size(bytes: u64) -> String {
        const KB: u64 = 1024;
        const MB: u64 = KB * 1024;
        const GB: u64 = MB * 1024;

        if bytes >= GB {
            format!("{:.2} GB", bytes as f64 / GB as f64)
        } else if bytes >= MB {
            format!("{:.2} MB", bytes as f64 / MB as f64)
        } else if bytes >= KB {
            format!("{:.2} KB", bytes as f64 / KB as f64)
        } else {
            format!("{} bytes", bytes)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compare_versions() {
        assert_eq!(UpdaterService::compare_versions("1.2.0", "1.3.0"), Ordering::Less);
        assert_eq!(UpdaterService::compare_versions("1.3.0", "1.3.0"), Ordering::Equal);
        assert_eq!(UpdaterService::compare_versions("1.4.0", "1.3.0"), Ordering::Greater);
        assert_eq!(UpdaterService::compare_versions("2.0.0", "1.9.9"), Ordering::Greater);
    }

    #[test]
    fn test_format_size() {
        assert_eq!(UpdaterService::format_size(500), "500 bytes");
        assert_eq!(UpdaterService::format_size(1536), "1.50 KB");
        assert_eq!(UpdaterService::format_size(1048576), "1.00 MB");
        assert_eq!(UpdaterService::format_size(1073741824), "1.00 GB");
    }

    #[test]
    fn test_get_current_version() {
        let version = UpdaterService::get_current_version();
        assert!(!version.is_empty());
        assert!(version.contains('.'));
    }
}
