use std::path::Path;
use std::fs;

/// Enable auto-start on system boot (Windows/Linux/macOS)
pub fn enable_autostart(install_dir: &Path) -> Result<(), String> {
    // Windows: Registry key
    #[cfg(target_os = "windows")]
    {
        enable_autostart_windows(install_dir)
    }

    // Linux: .desktop file in autostart
    #[cfg(target_os = "linux")]
    {
        enable_autostart_linux(install_dir)
    }

    // macOS: launchd plist
    #[cfg(target_os = "macos")]
    {
        enable_autostart_macos(install_dir)
    }
}

// ========== WINDOWS ==========
#[cfg(target_os = "windows")]
fn enable_autostart_windows(_install_dir: &Path) -> Result<(), String> {
    use std::process::Command;

    // Use the current executable path (where the installer is running from)
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get current exe path: {}", e))?;

    if !exe_path.exists() {
        return Err(format!("Executable not found: {}", exe_path.display()));
    }

    let exe_path_str = exe_path.to_string_lossy().to_string();

    let output = Command::new("reg")
        .args(&[
            "add",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "/v",
            "AgentPlayer",
            "/t",
            "REG_SZ",
            "/d",
            &format!("\"{}\" --background", exe_path_str), // Add --background flag
            "/f",
        ])
        .output()
        .map_err(|e| format!("Failed to run reg command: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Failed to add registry key: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    println!("[AutoStart] ✅ Added to Windows startup (Registry)");
    Ok(())
}

// ========== LINUX ==========
#[cfg(target_os = "linux")]
fn enable_autostart_linux(_install_dir: &Path) -> Result<(), String> {
    // Get user's home directory
    let home_dir = std::env::var("HOME")
        .map_err(|_| "Failed to get HOME directory".to_string())?;

    let autostart_dir = Path::new(&home_dir).join(".config/autostart");

    // Create autostart directory if it doesn't exist
    fs::create_dir_all(&autostart_dir)
        .map_err(|e| format!("Failed to create autostart directory: {}", e))?;

    let desktop_file = autostart_dir.join("agent-player.desktop");

    // Use the current executable path
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get current exe path: {}", e))?;

    if !exe_path.exists() {
        return Err(format!("Executable not found: {}", exe_path.display()));
    }

    // Create .desktop file
    let desktop_content = format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Name=Agent Player\n\
         Exec={} --background\n\
         Hidden=false\n\
         NoDisplay=false\n\
         X-GNOME-Autostart-enabled=true\n",
        exe_path.display()
    );

    fs::write(&desktop_file, desktop_content)
        .map_err(|e| format!("Failed to write desktop file: {}", e))?;

    println!("[AutoStart] ✅ Added to Linux autostart (~/.config/autostart/)");
    Ok(())
}

// ========== macOS ==========
#[cfg(target_os = "macos")]
fn enable_autostart_macos(_install_dir: &Path) -> Result<(), String> {
    // Get user's home directory
    let home_dir = std::env::var("HOME")
        .map_err(|_| "Failed to get HOME directory".to_string())?;

    let launch_agents_dir = Path::new(&home_dir).join("Library/LaunchAgents");

    // Create LaunchAgents directory if it doesn't exist
    fs::create_dir_all(&launch_agents_dir)
        .map_err(|e| format!("Failed to create LaunchAgents directory: {}", e))?;

    let plist_file = launch_agents_dir.join("com.agentplayer.startup.plist");

    // Use the current executable path
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get current exe path: {}", e))?;

    if !exe_path.exists() {
        return Err(format!("Executable not found: {}", exe_path.display()));
    }

    // Create launchd plist file
    let plist_content = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
         <!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n\
         <plist version=\"1.0\">\n\
         <dict>\n\
             <key>Label</key>\n\
             <string>com.agentplayer.startup</string>\n\
             <key>ProgramArguments</key>\n\
             <array>\n\
                 <string>{}</string>\n\
                 <string>--background</string>\n\
             </array>\n\
             <key>RunAtLoad</key>\n\
             <true/>\n\
             <key>KeepAlive</key>\n\
             <false/>\n\
         </dict>\n\
         </plist>\n",
        exe_path.display()
    );

    fs::write(&plist_file, plist_content)
        .map_err(|e| format!("Failed to write plist file: {}", e))?;

    println!("[AutoStart] ✅ Added to macOS startup (~/Library/LaunchAgents/)");
    Ok(())
}

/// Disable auto-start
pub fn disable_autostart() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let output = Command::new("reg")
            .args(&[
                "delete",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v",
                "AgentPlayer",
                "/f",
            ])
            .output()
            .map_err(|e| format!("Failed to run reg command: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            if !stderr.contains("was not found") {
                return Err(format!("Failed to remove registry key: {}", stderr));
            }
        }

        println!("[AutoStart] ✅ Removed from Windows startup");
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        let home_dir = std::env::var("HOME")
            .map_err(|_| "Failed to get HOME directory".to_string())?;

        let desktop_file = Path::new(&home_dir)
            .join(".config/autostart/agent-player.desktop");

        if desktop_file.exists() {
            fs::remove_file(&desktop_file)
                .map_err(|e| format!("Failed to remove desktop file: {}", e))?;
        }

        println!("[AutoStart] ✅ Removed from Linux autostart");
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        let home_dir = std::env::var("HOME")
            .map_err(|_| "Failed to get HOME directory".to_string())?;

        let plist_file = Path::new(&home_dir)
            .join("Library/LaunchAgents/com.agentplayer.startup.plist");

        if plist_file.exists() {
            fs::remove_file(&plist_file)
                .map_err(|e| format!("Failed to remove plist file: {}", e))?;
        }

        println!("[AutoStart] ✅ Removed from macOS startup");
        Ok(())
    }
}

/// Check if auto-start is enabled
pub fn is_autostart_enabled() -> bool {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let output = Command::new("reg")
            .args(&[
                "query",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v",
                "AgentPlayer",
            ])
            .output();

        match output {
            Ok(result) => result.status.success(),
            Err(_) => false,
        }
    }

    #[cfg(target_os = "linux")]
    {
        let home_dir = std::env::var("HOME").unwrap_or_default();
        let desktop_file = Path::new(&home_dir)
            .join(".config/autostart/agent-player.desktop");
        desktop_file.exists()
    }

    #[cfg(target_os = "macos")]
    {
        let home_dir = std::env::var("HOME").unwrap_or_default();
        let plist_file = Path::new(&home_dir)
            .join("Library/LaunchAgents/com.agentplayer.startup.plist");
        plist_file.exists()
    }
}
