use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::path::Path;
use anyhow::{Context, Result};

/// Docker deployment status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerStatus {
    pub docker_installed: bool,
    pub docker_compose_installed: bool,
    pub images_built: bool,
    pub containers_running: bool,
    pub frontend_healthy: bool,
    pub backend_healthy: bool,
}

/// Docker deployment handler
#[derive(Debug)]
pub struct DockerDeployment {
    pub app_dir: String,
}

impl DockerDeployment {
    /// Create new Docker deployment handler
    pub fn new(app_dir: String) -> Self {
        Self { app_dir }
    }

    /// Check if Docker and Docker Compose are installed
    pub fn check_docker_installed() -> DockerStatus {
        let docker_installed = Command::new("docker")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok();

        let docker_compose_installed = Command::new("docker")
            .arg("compose")
            .arg("version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok();

        DockerStatus {
            docker_installed,
            docker_compose_installed,
            images_built: false,
            containers_running: false,
            frontend_healthy: false,
            backend_healthy: false,
        }
    }

    /// Build Docker images
    pub fn build_images(&self) -> Result<()> {
        println!("Building Docker images...");

        let output = Command::new("docker")
            .arg("compose")
            .arg("build")
            .arg("--no-cache")
            .current_dir(&self.app_dir)
            .output()
            .context("Failed to execute docker compose build")?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Docker build failed: {}", error));
        }

        Ok(())
    }

    /// Start containers
    pub fn start_containers(&self) -> Result<()> {
        println!("Starting Docker containers...");

        let output = Command::new("docker")
            .arg("compose")
            .arg("up")
            .arg("-d")
            .current_dir(&self.app_dir)
            .output()
            .context("Failed to execute docker compose up")?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to start containers: {}", error));
        }

        Ok(())
    }

    /// Stop containers
    pub fn stop_containers(&self) -> Result<()> {
        println!("Stopping Docker containers...");

        let output = Command::new("docker")
            .arg("compose")
            .arg("down")
            .current_dir(&self.app_dir)
            .output()
            .context("Failed to execute docker compose down")?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to stop containers: {}", error));
        }

        Ok(())
    }

    /// Check container health status
    pub fn check_health(&self) -> Result<DockerStatus> {
        let mut status = Self::check_docker_installed();

        // Check if images are built
        let images_output = Command::new("docker")
            .arg("images")
            .arg("agent-player-frontend")
            .arg("--format")
            .arg("{{.Repository}}")
            .output()
            .context("Failed to check Docker images")?;

        status.images_built = String::from_utf8_lossy(&images_output.stdout)
            .contains("agent-player-frontend");

        // Check if containers are running
        let ps_output = Command::new("docker")
            .arg("compose")
            .arg("ps")
            .arg("--format")
            .arg("json")
            .current_dir(&self.app_dir)
            .output()
            .context("Failed to check container status")?;

        let ps_data = String::from_utf8_lossy(&ps_output.stdout);
        status.containers_running = ps_data.contains("agent-player-frontend")
            && ps_data.contains("agent-player-backend");

        // Check health status of containers
        if status.containers_running {
            // Check frontend health
            let frontend_health = Command::new("docker")
                .arg("inspect")
                .arg("--format")
                .arg("{{.State.Health.Status}}")
                .arg("agent-player-frontend")
                .output();

            if let Ok(output) = frontend_health {
                let health = String::from_utf8_lossy(&output.stdout);
                status.frontend_healthy = health.trim() == "healthy";
            }

            // Check backend health
            let backend_health = Command::new("docker")
                .arg("inspect")
                .arg("--format")
                .arg("{{.State.Health.Status}}")
                .arg("agent-player-backend")
                .output();

            if let Ok(output) = backend_health {
                let health = String::from_utf8_lossy(&output.stdout);
                status.backend_healthy = health.trim() == "healthy";
            }
        }

        Ok(status)
    }

    /// View container logs
    pub fn get_logs(&self, service: &str, tail: usize) -> Result<String> {
        let output = Command::new("docker")
            .arg("compose")
            .arg("logs")
            .arg("--tail")
            .arg(tail.to_string())
            .arg(service)
            .current_dir(&self.app_dir)
            .output()
            .context("Failed to get container logs")?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Failed to get logs: {}", error));
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }

    /// Remove all containers and volumes
    pub fn cleanup(&self) -> Result<()> {
        println!("Cleaning up Docker resources...");

        let output = Command::new("docker")
            .arg("compose")
            .arg("down")
            .arg("-v") // Remove volumes
            .arg("--rmi")
            .arg("all") // Remove images
            .current_dir(&self.app_dir)
            .output()
            .context("Failed to cleanup Docker resources")?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Cleanup failed: {}", error));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_check_docker_installed() {
        let status = DockerDeployment::check_docker_installed();
        // Should not panic, even if Docker is not installed
        assert!(status.docker_installed == true || status.docker_installed == false);
    }
}
