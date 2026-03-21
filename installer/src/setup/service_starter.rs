use std::process::{Command, Stdio};
use std::path::Path;
use std::thread;
use std::time::Duration;

/// Start development servers (backend + frontend)
pub fn start_development_servers(install_dir: &Path) -> Result<(), String> {
    println!("[ServiceStarter] 🚀 Starting development servers...");

    // Path to the agent_player directory
    let agent_player_dir = install_dir;

    if !agent_player_dir.exists() {
        return Err(format!("Agent Player directory not found: {}", agent_player_dir.display()));
    }

    // Start backend server
    println!("[ServiceStarter] 🔧 Starting backend on port 41522...");
    let backend_dir = agent_player_dir.join("packages").join("backend");

    if !backend_dir.exists() {
        return Err(format!("Backend directory not found: {}", backend_dir.display()));
    }

    #[cfg(target_os = "windows")]
    {
        let backend_dir_str = backend_dir.to_string_lossy().to_string();

        // Use PowerShell to start backend in a new window
        let result = Command::new("powershell.exe")
            .args(&[
                "-NoProfile",
                "-Command",
                &format!("Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd \"{}\"; pnpm dev'", backend_dir_str)
            ])
            .spawn();

        if let Err(e) = result {
            return Err(format!("Failed to start backend: {}. Make sure PowerShell and pnpm are installed.", e));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let result = Command::new("sh")
            .args(&["-c", "pnpm dev &"])
            .current_dir(&backend_dir)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();

        if let Err(e) = result {
            return Err(format!("Failed to start backend: {}", e));
        }
    }

    println!("[ServiceStarter] ✅ Backend command launched");

    // Wait 3 seconds before starting frontend
    println!("[ServiceStarter] ⏳ Waiting 3 seconds before starting frontend...");
    thread::sleep(Duration::from_secs(3));

    // Start frontend server
    println!("[ServiceStarter] 🔧 Starting frontend on port 41521...");

    #[cfg(target_os = "windows")]
    {
        let frontend_dir_str = agent_player_dir.to_string_lossy().to_string();

        // Use PowerShell to start frontend in a new window
        let result = Command::new("powershell.exe")
            .args(&[
                "-NoProfile",
                "-Command",
                &format!("Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd \"{}\"; pnpm dev'", frontend_dir_str)
            ])
            .spawn();

        if let Err(e) = result {
            return Err(format!("Failed to start frontend: {}. Make sure PowerShell and pnpm are installed.", e));
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let result = Command::new("sh")
            .args(&["-c", "pnpm dev &"])
            .current_dir(&agent_player_dir)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();

        if let Err(e) = result {
            return Err(format!("Failed to start frontend: {}", e));
        }
    }

    println!("[ServiceStarter] ✅ Frontend command launched");

    // Wait for servers to be ready (check ports)
    println!("[ServiceStarter] 🔍 Waiting for servers to be ready...");

    for i in 1..=30 {
        // Check backend port 41522
        let backend_ready = check_port_in_use(41522);
        // Check frontend port 41521
        let frontend_ready = check_port_in_use(41521);

        if backend_ready && frontend_ready {
            println!("[ServiceStarter] ✅ Both servers are ready!");
            println!("[ServiceStarter] 🎉 Backend: http://localhost:41522");
            println!("[ServiceStarter] 🎉 Frontend: http://localhost:41521");
            return Ok(());
        }

        if i % 5 == 0 {
            println!("[ServiceStarter] ⏳ Still waiting... ({}/30 attempts)", i);
            println!("[ServiceStarter]    Backend ready: {}, Frontend ready: {}", backend_ready, frontend_ready);
        }

        thread::sleep(Duration::from_secs(2));
    }

    Err("Timeout: Servers did not start within 60 seconds.\n\nPossible issues:\n1. pnpm is not installed\n2. Node.js is not installed\n3. Dependencies are not installed (run 'pnpm install' manually)\n4. Ports 41521/41522 are already in use".to_string())
}

/// Check if a port is in use (servers are running)
fn check_port_in_use(port: u16) -> bool {
    use std::net::TcpListener;

    // If we CAN bind to the port, it means it's FREE (server NOT running)
    // If we CANNOT bind, it means it's IN USE (server IS running)
    match TcpListener::bind(("127.0.0.1", port)) {
        Ok(_) => false,  // Port is free - server NOT running
        Err(_) => true,  // Port is in use - server IS running
    }
}
