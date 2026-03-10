use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use anyhow::{Context, Result};

/// Log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub service: String,
}

/// Log level filter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LogLevel {
    All,
    Info,
    Warn,
    Error,
}

/// Logs service for viewing service logs
pub struct LogsService;

impl LogsService {
    /// Get logs for a specific service
    pub fn get_logs(service: &str, tail: usize, level: LogLevel) -> Result<Vec<LogEntry>> {
        let mut logs = Vec::new();

        #[cfg(target_os = "linux")]
        {
            logs = Self::get_systemd_logs(service, tail)?;
        }

        #[cfg(target_os = "macos")]
        {
            logs = Self::get_launchd_logs(service, tail)?;
        }

        #[cfg(target_os = "windows")]
        {
            logs = Self::get_windows_logs(service, tail)?;
        }

        // Filter by level
        logs = Self::filter_by_level(logs, level);

        Ok(logs)
    }

    #[cfg(target_os = "linux")]
    fn get_systemd_logs(service: &str, tail: usize) -> Result<Vec<LogEntry>> {
        let service_name = match service {
            "backend" => "agent-player.service",
            "frontend" => "agent-player-frontend.service",
            _ => return Err(anyhow::anyhow!("Unknown service: {}", service)),
        };

        let output = Command::new("journalctl")
            .args(["-u", service_name, "-n", &tail.to_string(), "--no-pager"])
            .output()
            .context("Failed to run journalctl")?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("journalctl failed"));
        }

        let log_text = String::from_utf8_lossy(&output.stdout);
        let mut entries = Vec::new();

        for line in log_text.lines() {
            if let Some(entry) = Self::parse_systemd_log_line(line, service) {
                entries.push(entry);
            }
        }

        Ok(entries)
    }

    #[cfg(target_os = "macos")]
    fn get_launchd_logs(service: &str, tail: usize) -> Result<Vec<LogEntry>> {
        let install_dir = Self::get_install_dir()?;
        let log_file = match service {
            "backend" => install_dir.join("logs/backend.log"),
            "frontend" => install_dir.join("logs/frontend.log"),
            _ => return Err(anyhow::anyhow!("Unknown service: {}", service)),
        };

        if !log_file.exists() {
            return Ok(Vec::new());
        }

        let output = Command::new("tail")
            .args(["-n", &tail.to_string(), log_file.to_str().unwrap()])
            .output()
            .context("Failed to read log file")?;

        let log_text = String::from_utf8_lossy(&output.stdout);
        let mut entries = Vec::new();

        for line in log_text.lines() {
            entries.push(LogEntry {
                timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                level: "INFO".to_string(),
                message: line.to_string(),
                service: service.to_string(),
            });
        }

        Ok(entries)
    }

    #[cfg(target_os = "windows")]
    fn get_windows_logs(service: &str, tail: usize) -> Result<Vec<LogEntry>> {
        let install_dir = Self::get_install_dir()?;
        let log_file = match service {
            "backend" => install_dir.join("logs\\backend.log"),
            "frontend" => install_dir.join("logs\\frontend.log"),
            _ => return Err(anyhow::anyhow!("Unknown service: {}", service)),
        };

        if !log_file.exists() {
            return Ok(Vec::new());
        }

        // Read last N lines from log file
        let content = fs::read_to_string(&log_file)
            .context("Failed to read log file")?;

        let lines: Vec<&str> = content.lines().collect();
        let start = if lines.len() > tail {
            lines.len() - tail
        } else {
            0
        };

        let mut entries = Vec::new();
        for line in &lines[start..] {
            entries.push(LogEntry {
                timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                level: Self::detect_log_level(line),
                message: line.to_string(),
                service: service.to_string(),
            });
        }

        Ok(entries)
    }

    /// Parse systemd log line
    fn parse_systemd_log_line(line: &str, service: &str) -> Option<LogEntry> {
        // Format: "Jan 01 12:00:00 hostname service[pid]: message"
        let parts: Vec<&str> = line.splitn(4, ' ').collect();
        if parts.len() < 4 {
            return None;
        }

        let timestamp = format!("{} {} {}", parts[0], parts[1], parts[2]);
        let message = parts[3].to_string();
        let level = Self::detect_log_level(&message);

        Some(LogEntry {
            timestamp,
            level,
            message,
            service: service.to_string(),
        })
    }

    /// Detect log level from message
    fn detect_log_level(message: &str) -> String {
        let lower = message.to_lowercase();
        if lower.contains("error") || lower.contains("fatal") {
            "ERROR".to_string()
        } else if lower.contains("warn") {
            "WARN".to_string()
        } else {
            "INFO".to_string()
        }
    }

    /// Filter logs by level
    fn filter_by_level(logs: Vec<LogEntry>, level: LogLevel) -> Vec<LogEntry> {
        match level {
            LogLevel::All => logs,
            LogLevel::Info => logs.into_iter().filter(|e| e.level == "INFO").collect(),
            LogLevel::Warn => logs.into_iter().filter(|e| e.level == "WARN").collect(),
            LogLevel::Error => logs.into_iter().filter(|e| e.level == "ERROR").collect(),
        }
    }

    /// Get installation directory
    fn get_install_dir() -> Result<PathBuf> {
        #[cfg(target_os = "windows")]
        {
            Ok(PathBuf::from("C:\\Program Files\\AgentPlayer"))
        }

        #[cfg(target_os = "linux")]
        {
            Ok(PathBuf::from("/opt/agent-player"))
        }

        #[cfg(target_os = "macos")]
        {
            Ok(PathBuf::from("/Applications/Agent Player.app/Contents/Resources"))
        }
    }

    /// Export logs to file
    pub fn export_logs(service: &str, output_path: &Path) -> Result<()> {
        let logs = Self::get_logs(service, 10000, LogLevel::All)?;

        let mut content = String::new();
        content.push_str(&format!("Agent Player Logs - Service: {}\n", service));
        content.push_str(&format!("Exported: {}\n", chrono::Local::now().format("%Y-%m-%d %H:%M:%S")));
        content.push_str(&"=".repeat(80));
        content.push('\n');

        for entry in logs {
            content.push_str(&format!("[{}] [{}] {}\n", entry.timestamp, entry.level, entry.message));
        }

        fs::write(output_path, content)
            .context("Failed to write log file")?;

        Ok(())
    }

    /// Stream logs in real-time
    pub fn stream_logs(service: &str) -> Result<std::process::Child> {
        #[cfg(target_os = "linux")]
        {
            let service_name = match service {
                "backend" => "agent-player.service",
                "frontend" => "agent-player-frontend.service",
                _ => return Err(anyhow::anyhow!("Unknown service: {}", service)),
            };

            Command::new("journalctl")
                .args(["-u", service_name, "-f", "--no-pager"])
                .spawn()
                .context("Failed to start log stream")
        }

        #[cfg(not(target_os = "linux"))]
        {
            let install_dir = Self::get_install_dir()?;
            let log_file = match service {
                "backend" => install_dir.join("logs/backend.log"),
                "frontend" => install_dir.join("logs/frontend.log"),
                _ => return Err(anyhow::anyhow!("Unknown service: {}", service)),
            };

            Command::new("tail")
                .args(["-f", log_file.to_str().unwrap()])
                .spawn()
                .context("Failed to start log stream")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_log_level() {
        assert_eq!(LogsService::detect_log_level("ERROR: Something went wrong"), "ERROR");
        assert_eq!(LogsService::detect_log_level("WARN: This is a warning"), "WARN");
        assert_eq!(LogsService::detect_log_level("INFO: Normal message"), "INFO");
    }

    #[test]
    fn test_filter_by_level() {
        let logs = vec![
            LogEntry {
                timestamp: "2024-01-01 12:00:00".to_string(),
                level: "INFO".to_string(),
                message: "Test".to_string(),
                service: "backend".to_string(),
            },
            LogEntry {
                timestamp: "2024-01-01 12:00:01".to_string(),
                level: "ERROR".to_string(),
                message: "Error".to_string(),
                service: "backend".to_string(),
            },
        ];

        let errors = LogsService::filter_by_level(logs.clone(), LogLevel::Error);
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].level, "ERROR");
    }
}
