use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::{Context, Result};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Direct deployment status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectStatus {
    pub nodejs_extracted: bool,
    pub python_extracted: bool,
    pub dependencies_installed: bool,
    pub production_built: bool,
    pub service_installed: bool,
    pub backend_running: bool,
    pub frontend_running: bool,
}

/// Direct deployment handler
#[derive(Debug)]
pub struct DirectDeployment {
    pub install_dir: PathBuf,
}

impl DirectDeployment {
    /// Create new direct deployment handler
    pub fn new(install_dir: PathBuf) -> Self {
        Self { install_dir }
    }

    /// Install dependencies (pnpm install --prod)
    pub fn install_dependencies(&self) -> Result<()> {
        println!("Installing production dependencies...");

        let pnpm_path = if cfg!(target_os = "windows") {
            self.install_dir.join("runtime").join("node").join("pnpm.cmd")
        } else {
            self.install_dir.join("runtime").join("node").join("bin").join("pnpm")
        };

        let app_dir = self.install_dir.join("app");

        let mut command = Command::new(&pnpm_path);
        command
            .arg("install")
            .arg("--prod")
            .arg("--frozen-lockfile")
            .current_dir(&app_dir);

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let output = command
            .output()
            .context("Failed to execute pnpm install")?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("pnpm install failed: {}", error));
        }

        Ok(())
    }

    /// Build production assets (pnpm build)
    pub fn build_production(&self) -> Result<()> {
        println!("Building production assets...");

        let pnpm_path = if cfg!(target_os = "windows") {
            self.install_dir.join("runtime").join("node").join("pnpm.cmd")
        } else {
            self.install_dir.join("runtime").join("node").join("bin").join("pnpm")
        };

        let app_dir = self.install_dir.join("app");

        let mut command = Command::new(&pnpm_path);
        command
            .arg("build")
            .current_dir(&app_dir);

        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let output = command
            .output()
            .context("Failed to execute pnpm build")?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("pnpm build failed: {}", error));
        }

        Ok(())
    }

    /// Install system service
    pub fn install_service(&self, config: &ServiceConfig) -> Result<()> {
        #[cfg(target_os = "linux")]
        return self.install_systemd_service(config);

        #[cfg(target_os = "macos")]
        return self.install_launchd_service(config);

        #[cfg(target_os = "windows")]
        return self.install_windows_service(config);
    }

    #[cfg(target_os = "linux")]
    fn install_systemd_service(&self, config: &ServiceConfig) -> Result<()> {
        use std::env;

        println!("Installing systemd services...");

        let templates_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("templates");

        let backend_template = fs::read_to_string(templates_dir.join("agent-player.service.template"))
            .context("Failed to read backend service template")?;

        let frontend_template = fs::read_to_string(templates_dir.join("agent-player-frontend.service.template"))
            .context("Failed to read frontend service template")?;

        let user = env::var("USER").unwrap_or_else(|_| String::from("root"));

        let backend_service = backend_template
            .replace("{{USER}}", &user)
            .replace("{{INSTALL_DIR}}", self.install_dir.to_str().unwrap())
            .replace("{{BACKEND_PORT}}", &config.backend_port.to_string());

        let frontend_service = frontend_template
            .replace("{{USER}}", &user)
            .replace("{{INSTALL_DIR}}", self.install_dir.to_str().unwrap())
            .replace("{{FRONTEND_PORT}}", &config.frontend_port.to_string())
            .replace("{{BACKEND_PORT}}", &config.backend_port.to_string());

        let systemd_dir = Path::new("/etc/systemd/system");
        fs::write(systemd_dir.join("agent-player.service"), backend_service)
            .context("Failed to write backend service file")?;
        fs::write(systemd_dir.join("agent-player-frontend.service"), frontend_service)
            .context("Failed to write frontend service file")?;

        Command::new("systemctl")
            .arg("daemon-reload")
            .output()
            .context("Failed to reload systemd")?;

        if config.auto_start {
            Command::new("systemctl")
                .args(["enable", "agent-player.service"])
                .output()
                .context("Failed to enable backend service")?;
            Command::new("systemctl")
                .args(["enable", "agent-player-frontend.service"])
                .output()
                .context("Failed to enable frontend service")?;
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    fn install_launchd_service(&self, config: &ServiceConfig) -> Result<()> {
        use std::env;

        println!("Installing launchd services...");

        let templates_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("templates");

        let backend_template = fs::read_to_string(templates_dir.join("agent-player.plist.template"))
            .context("Failed to read backend plist template")?;

        let frontend_template = fs::read_to_string(templates_dir.join("agent-player-frontend.plist.template"))
            .context("Failed to read frontend plist template")?;

        let user = env::var("USER").unwrap_or_else(|_| String::from("nobody"));

        let backend_plist = backend_template
            .replace("{{USER}}", &user)
            .replace("{{INSTALL_DIR}}", self.install_dir.to_str().unwrap())
            .replace("{{BACKEND_PORT}}", &config.backend_port.to_string());

        let frontend_plist = frontend_template
            .replace("{{USER}}", &user)
            .replace("{{INSTALL_DIR}}", self.install_dir.to_str().unwrap())
            .replace("{{FRONTEND_PORT}}", &config.frontend_port.to_string())
            .replace("{{BACKEND_PORT}}", &config.backend_port.to_string());

        let launchd_dir = Path::new("/Library/LaunchDaemons");
        fs::write(launchd_dir.join("com.agentplayer.backend.plist"), backend_plist)
            .context("Failed to write backend plist file")?;
        fs::write(launchd_dir.join("com.agentplayer.frontend.plist"), frontend_plist)
            .context("Failed to write frontend plist file")?;

        if config.auto_start {
            Command::new("launchctl")
                .args(["load", "/Library/LaunchDaemons/com.agentplayer.backend.plist"])
                .output()
                .context("Failed to load backend service")?;
            Command::new("launchctl")
                .args(["load", "/Library/LaunchDaemons/com.agentplayer.frontend.plist"])
                .output()
                .context("Failed to load frontend service")?;
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn install_windows_service(&self, config: &ServiceConfig) -> Result<()> {
        println!("Installing Windows services with WinSW...");

        let templates_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("resources")
            .join("templates");

        let backend_template = fs::read_to_string(templates_dir.join("agent-player-backend.xml.template"))
            .context("Failed to read backend XML template")?;

        let frontend_template = fs::read_to_string(templates_dir.join("agent-player-frontend.xml.template"))
            .context("Failed to read frontend XML template")?;

        let backend_xml = backend_template
            .replace("{{INSTALL_DIR}}", self.install_dir.to_str().unwrap())
            .replace("{{BACKEND_PORT}}", &config.backend_port.to_string());

        let frontend_xml = frontend_template
            .replace("{{INSTALL_DIR}}", self.install_dir.to_str().unwrap())
            .replace("{{FRONTEND_PORT}}", &config.frontend_port.to_string())
            .replace("{{BACKEND_PORT}}", &config.backend_port.to_string());

        let service_dir = self.install_dir.join("services");
        fs::create_dir_all(&service_dir).context("Failed to create services directory")?;

        fs::write(service_dir.join("agent-player-backend.xml"), backend_xml)
            .context("Failed to write backend XML file")?;
        fs::write(service_dir.join("agent-player-frontend.xml"), frontend_xml)
            .context("Failed to write frontend XML file")?;

        // Install services using WinSW (assuming WinSW.exe is bundled)
        let winsw_path = self.install_dir.join("runtime").join("WinSW.exe");

        if winsw_path.exists() {
            Command::new(&winsw_path)
                .args(["install", service_dir.join("agent-player-backend.xml").to_str().unwrap()])
                .output()
                .context("Failed to install backend service")?;

            Command::new(&winsw_path)
                .args(["install", service_dir.join("agent-player-frontend.xml").to_str().unwrap()])
                .output()
                .context("Failed to install frontend service")?;
        }

        Ok(())
    }

    /// Start services
    pub fn start_services(&self) -> Result<()> {
        #[cfg(target_os = "linux")]
        {
            Command::new("systemctl")
                .args(["start", "agent-player.service"])
                .output()
                .context("Failed to start backend service")?;
            Command::new("systemctl")
                .args(["start", "agent-player-frontend.service"])
                .output()
                .context("Failed to start frontend service")?;
        }

        #[cfg(target_os = "macos")]
        {
            Command::new("launchctl")
                .args(["start", "com.agentplayer.backend"])
                .output()
                .context("Failed to start backend service")?;
            Command::new("launchctl")
                .args(["start", "com.agentplayer.frontend"])
                .output()
                .context("Failed to start frontend service")?;
        }

        #[cfg(target_os = "windows")]
        {
            Command::new("sc")
                .args(["start", "AgentPlayerBackend"])
                .output()
                .context("Failed to start backend service")?;
            Command::new("sc")
                .args(["start", "AgentPlayerFrontend"])
                .output()
                .context("Failed to start frontend service")?;
        }

        Ok(())
    }

    /// Stop services
    pub fn stop_services(&self) -> Result<()> {
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

        Ok(())
    }

    /// Check service status
    pub fn check_status(&self) -> Result<DirectStatus> {
        let mut status = DirectStatus {
            nodejs_extracted: false,
            python_extracted: false,
            dependencies_installed: false,
            production_built: false,
            service_installed: false,
            backend_running: false,
            frontend_running: false,
        };

        // Check runtimes
        let node_binary = if cfg!(target_os = "windows") {
            self.install_dir.join("runtime").join("node").join("node.exe")
        } else {
            self.install_dir.join("runtime").join("node").join("bin").join("node")
        };
        status.nodejs_extracted = node_binary.exists();

        let python_binary = if cfg!(target_os = "windows") {
            self.install_dir.join("runtime").join("python").join("python.exe")
        } else {
            self.install_dir.join("runtime").join("python").join("bin").join("python3")
        };
        status.python_extracted = python_binary.exists();

        // Check dependencies
        status.dependencies_installed = self.install_dir
            .join("app")
            .join("node_modules")
            .exists();

        // Check production build
        status.production_built = self.install_dir
            .join("app")
            .join("packages")
            .join("frontend")
            .join(".next")
            .exists();

        // Check service status (OS-specific)
        #[cfg(target_os = "linux")]
        {
            if let Ok(output) = Command::new("systemctl")
                .args(["is-active", "agent-player.service"])
                .output()
            {
                status.backend_running = String::from_utf8_lossy(&output.stdout).trim() == "active";
            }
            if let Ok(output) = Command::new("systemctl")
                .args(["is-active", "agent-player-frontend.service"])
                .output()
            {
                status.frontend_running = String::from_utf8_lossy(&output.stdout).trim() == "active";
            }
        }

        #[cfg(target_os = "windows")]
        {
            if let Ok(output) = Command::new("sc")
                .args(["query", "AgentPlayerBackend"])
                .output()
            {
                status.backend_running = String::from_utf8_lossy(&output.stdout).contains("RUNNING");
            }
            if let Ok(output) = Command::new("sc")
                .args(["query", "AgentPlayerFrontend"])
                .output()
            {
                status.frontend_running = String::from_utf8_lossy(&output.stdout).contains("RUNNING");
            }
        }

        Ok(status)
    }
}

/// Service configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub frontend_port: u16,
    pub backend_port: u16,
    pub auto_start: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_direct_deployment_creation() {
        let deployment = DirectDeployment::new(PathBuf::from("/opt/agent-player"));
        assert_eq!(deployment.install_dir, PathBuf::from("/opt/agent-player"));
    }
}
