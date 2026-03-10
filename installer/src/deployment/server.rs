use serde::{Deserialize, Serialize};
use ssh2::Session;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::fs;
use anyhow::{Context, Result};

/// SSH authentication method
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SshAuth {
    Password { password: String },
    PrivateKey { key_path: String, passphrase: Option<String> },
}

/// Server deployment configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth: SshAuth,
    pub install_path: String,
    pub domain: Option<String>,
    pub frontend_port: u16,
    pub backend_port: u16,
    pub setup_ssl: bool,
    pub setup_firewall: bool,
}

/// Server deployment status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub ssh_connected: bool,
    pub dependencies_installed: bool,
    pub files_uploaded: bool,
    pub production_built: bool,
    pub systemd_installed: bool,
    pub nginx_configured: bool,
    pub ssl_configured: bool,
    pub firewall_configured: bool,
    pub services_running: bool,
}

/// Server deployment handler
#[derive(Debug)]
pub struct ServerDeployment {
    pub config: ServerConfig,
}

impl ServerDeployment {
    /// Create new server deployment handler
    pub fn new(config: ServerConfig) -> Self {
        Self { config }
    }

    /// Test SSH connection
    pub fn test_connection(&self) -> Result<()> {
        println!("Testing SSH connection to {}...", self.config.host);

        let session = self.create_ssh_session()?;

        // Test simple command
        let output = self.execute_command(&session, "echo 'SSH connection successful'")?;

        if !output.contains("SSH connection successful") {
            return Err(anyhow::anyhow!("SSH connection test failed"));
        }

        Ok(())
    }

    /// Create SSH session
    fn create_ssh_session(&self) -> Result<Session> {
        let tcp = TcpStream::connect(format!("{}:{}", self.config.host, self.config.port))
            .context("Failed to establish TCP connection")?;

        let mut session = Session::new().context("Failed to create SSH session")?;
        session.set_tcp_stream(tcp);
        session.handshake().context("SSH handshake failed")?;

        // Authenticate
        match &self.config.auth {
            SshAuth::Password { password } => {
                session
                    .userauth_password(&self.config.username, password)
                    .context("SSH password authentication failed")?;
            }
            SshAuth::PrivateKey { key_path, passphrase } => {
                let passphrase_str = passphrase.as_deref();
                session
                    .userauth_pubkey_file(&self.config.username, None, Path::new(key_path), passphrase_str)
                    .context("SSH key authentication failed")?;
            }
        }

        if !session.authenticated() {
            return Err(anyhow::anyhow!("SSH authentication failed"));
        }

        Ok(session)
    }

    /// Execute remote command
    fn execute_command(&self, session: &Session, command: &str) -> Result<String> {
        let mut channel = session.channel_session()?;
        channel.exec(command)?;

        let mut output = String::new();
        channel.read_to_string(&mut output)?;

        channel.wait_close()?;
        let exit_status = channel.exit_status()?;

        if exit_status != 0 {
            let mut stderr = String::new();
            channel.stderr().read_to_string(&mut stderr)?;
            return Err(anyhow::anyhow!("Command failed with exit code {}: {}", exit_status, stderr));
        }

        Ok(output)
    }

    /// Check server requirements
    pub fn check_server_requirements(&self) -> Result<()> {
        println!("Checking server requirements...");

        let session = self.create_ssh_session()?;

        // Check Node.js
        let node_version = self.execute_command(&session, "node --version").ok();
        if node_version.is_none() {
            println!("Node.js not found, will install");
        } else {
            println!("Node.js found: {}", node_version.unwrap().trim());
        }

        // Check Python
        let python_version = self.execute_command(&session, "python3 --version").ok();
        if python_version.is_none() {
            println!("Python3 not found, will install");
        } else {
            println!("Python3 found: {}", python_version.unwrap().trim());
        }

        // Check nginx
        let nginx_version = self.execute_command(&session, "nginx -v 2>&1").ok();
        if nginx_version.is_none() {
            println!("nginx not found, will install");
        } else {
            println!("nginx found: {}", nginx_version.unwrap().trim());
        }

        // Check disk space (require at least 2GB)
        let df_output = self.execute_command(&session, "df -BG / | tail -1 | awk '{print $4}'")?;
        let available_gb: u32 = df_output.trim().trim_end_matches('G').parse()
            .context("Failed to parse disk space")?;

        if available_gb < 2 {
            return Err(anyhow::anyhow!("Insufficient disk space: {}GB available, 2GB required", available_gb));
        }

        println!("Disk space: {}GB available", available_gb);

        Ok(())
    }

    /// Install system dependencies
    pub fn install_dependencies(&self) -> Result<()> {
        println!("Installing system dependencies...");

        let session = self.create_ssh_session()?;

        // Detect package manager
        let has_apt = self.execute_command(&session, "which apt-get").is_ok();
        let has_yum = self.execute_command(&session, "which yum").is_ok();

        if has_apt {
            println!("Using apt package manager");
            self.execute_command(&session, "sudo apt-get update")?;
            self.execute_command(&session,
                "sudo apt-get install -y curl wget git nginx python3 python3-pip build-essential")?;
        } else if has_yum {
            println!("Using yum package manager");
            self.execute_command(&session, "sudo yum install -y epel-release")?;
            self.execute_command(&session,
                "sudo yum install -y curl wget git nginx python3 python3-pip gcc gcc-c++ make")?;
        } else {
            return Err(anyhow::anyhow!("Unsupported package manager"));
        }

        // Install Node.js 20 LTS
        println!("Installing Node.js 20 LTS...");
        self.execute_command(&session,
            "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -")?;

        if has_apt {
            self.execute_command(&session, "sudo apt-get install -y nodejs")?;
        } else if has_yum {
            self.execute_command(&session, "sudo yum install -y nodejs")?;
        }

        // Install pnpm
        println!("Installing pnpm...");
        self.execute_command(&session, "sudo npm install -g pnpm@9.15.4")?;

        // Install Python packages
        println!("Installing Python packages...");
        self.execute_command(&session, "sudo pip3 install edge-tts==7.2.7 faster-whisper==1.2.1")?;

        Ok(())
    }

    /// Upload application files
    pub fn upload_files(&self, local_source_dir: &Path) -> Result<()> {
        println!("Uploading application files...");

        let session = self.create_ssh_session()?;

        // Create installation directory
        self.execute_command(&session, &format!("mkdir -p {}", self.config.install_path))?;

        // Upload files via SFTP
        let sftp = session.sftp().context("Failed to create SFTP session")?;

        // Upload package.json
        let package_json = local_source_dir.join("package.json");
        if package_json.exists() {
            let local_content = fs::read_to_string(&package_json)?;
            let remote_path = format!("{}/package.json", self.config.install_path);
            let mut remote_file = sftp.create(Path::new(&remote_path))?;
            remote_file.write_all(local_content.as_bytes())?;
            println!("Uploaded package.json");
        }

        // Upload packages directory (recursive)
        let packages_dir = local_source_dir.join("packages");
        if packages_dir.exists() {
            self.upload_directory_recursive(&sftp, &packages_dir, &format!("{}/packages", self.config.install_path))?;
            println!("Uploaded packages directory");
        }

        // Upload public directory
        let public_dir = local_source_dir.join("public");
        if public_dir.exists() {
            self.upload_directory_recursive(&sftp, &public_dir, &format!("{}/public", self.config.install_path))?;
            println!("Uploaded public directory");
        }

        // Upload .env file if exists
        let env_file = local_source_dir.join(".env");
        if env_file.exists() {
            let local_content = fs::read_to_string(&env_file)?;
            let remote_path = format!("{}/.env", self.config.install_path);
            let mut remote_file = sftp.create(Path::new(&remote_path))?;
            remote_file.write_all(local_content.as_bytes())?;
            println!("Uploaded .env file");
        }

        Ok(())
    }

    /// Upload directory recursively via SFTP
    fn upload_directory_recursive(&self, sftp: &ssh2::Sftp, local_dir: &Path, remote_dir: &str) -> Result<()> {
        // Create remote directory
        sftp.mkdir(Path::new(remote_dir), 0o755).ok();

        for entry in fs::read_dir(local_dir)? {
            let entry = entry?;
            let file_type = entry.file_type()?;
            let file_name = entry.file_name();
            let local_path = entry.path();
            let remote_path = format!("{}/{}", remote_dir, file_name.to_string_lossy());

            if file_type.is_dir() {
                // Skip node_modules and hidden directories
                if file_name == "node_modules" || file_name.to_string_lossy().starts_with('.') {
                    continue;
                }
                self.upload_directory_recursive(sftp, &local_path, &remote_path)?;
            } else if file_type.is_file() {
                let local_content = fs::read(&local_path)?;
                let mut remote_file = sftp.create(Path::new(&remote_path))?;
                remote_file.write_all(&local_content)?;
            }
        }

        Ok(())
    }

    /// Build production assets remotely
    pub fn build_production(&self) -> Result<()> {
        println!("Building production assets remotely...");

        let session = self.create_ssh_session()?;

        // Install dependencies
        println!("Running pnpm install...");
        self.execute_command(&session, &format!("cd {} && pnpm install --prod --frozen-lockfile", self.config.install_path))?;

        // Build production
        println!("Running pnpm build...");
        self.execute_command(&session, &format!("cd {} && pnpm build", self.config.install_path))?;

        Ok(())
    }

    /// Configure systemd services
    pub fn configure_systemd(&self) -> Result<()> {
        println!("Configuring systemd services...");

        let session = self.create_ssh_session()?;

        // Backend service
        let backend_service = format!(r#"[Unit]
Description=Agent Player Backend
After=network.target

[Service]
Type=simple
User={user}
WorkingDirectory={install_path}/packages/backend
Environment="NODE_ENV=production"
Environment="PORT={backend_port}"
ExecStart=/usr/bin/node dist/api/server.js
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
"#,
            user = self.config.username,
            install_path = self.config.install_path,
            backend_port = self.config.backend_port
        );

        // Write backend service file
        self.execute_command(&session, &format!(
            "echo '{}' | sudo tee /etc/systemd/system/agent-player.service",
            backend_service
        ))?;

        // Frontend service
        let frontend_service = format!(r#"[Unit]
Description=Agent Player Frontend
After=network.target agent-player.service
Requires=agent-player.service

[Service]
Type=simple
User={user}
WorkingDirectory={install_path}
Environment="NODE_ENV=production"
Environment="PORT={frontend_port}"
Environment="NEXT_PUBLIC_API_URL=http://localhost:{backend_port}"
ExecStart=/usr/bin/node packages/frontend/server.js
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
"#,
            user = self.config.username,
            install_path = self.config.install_path,
            frontend_port = self.config.frontend_port,
            backend_port = self.config.backend_port
        );

        // Write frontend service file
        self.execute_command(&session, &format!(
            "echo '{}' | sudo tee /etc/systemd/system/agent-player-frontend.service",
            frontend_service
        ))?;

        // Reload systemd
        self.execute_command(&session, "sudo systemctl daemon-reload")?;

        // Enable services
        self.execute_command(&session, "sudo systemctl enable agent-player.service")?;
        self.execute_command(&session, "sudo systemctl enable agent-player-frontend.service")?;

        Ok(())
    }

    /// Configure nginx reverse proxy
    pub fn configure_nginx(&self) -> Result<()> {
        println!("Configuring nginx reverse proxy...");

        let session = self.create_ssh_session()?;

        let server_name = self.config.domain.as_deref().unwrap_or(&self.config.host);

        let nginx_config = format!(r#"server {{
    listen 80;
    server_name {server_name};

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {server_name};

    # SSL certificates (will be configured by Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/{server_name}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{server_name}/privkey.pem;

    # Frontend
    location / {{
        proxy_pass http://localhost:{frontend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }}

    # Backend API
    location /api {{
        proxy_pass http://localhost:{backend_port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }}
}}
"#,
            server_name = server_name,
            frontend_port = self.config.frontend_port,
            backend_port = self.config.backend_port
        );

        // Write nginx config
        self.execute_command(&session, &format!(
            "echo '{}' | sudo tee /etc/nginx/sites-available/agent-player",
            nginx_config
        ))?;

        // Create symlink
        self.execute_command(&session,
            "sudo ln -sf /etc/nginx/sites-available/agent-player /etc/nginx/sites-enabled/agent-player")?;

        // Test nginx config
        self.execute_command(&session, "sudo nginx -t")?;

        Ok(())
    }

    /// Setup SSL with Let's Encrypt
    pub fn setup_ssl(&self) -> Result<()> {
        if !self.config.setup_ssl {
            return Ok(());
        }

        let domain = match &self.config.domain {
            Some(d) => d,
            None => return Err(anyhow::anyhow!("Domain required for SSL setup")),
        };

        println!("Setting up SSL certificate for {}...", domain);

        let session = self.create_ssh_session()?;

        // Install certbot
        println!("Installing certbot...");
        self.execute_command(&session, "sudo apt-get install -y certbot python3-certbot-nginx || sudo yum install -y certbot python3-certbot-nginx")?;

        // Obtain certificate
        println!("Obtaining SSL certificate...");
        self.execute_command(&session, &format!(
            "sudo certbot --nginx -d {} --non-interactive --agree-tos --email admin@{}",
            domain, domain
        ))?;

        // Setup auto-renewal
        self.execute_command(&session, "sudo systemctl enable certbot.timer")?;
        self.execute_command(&session, "sudo systemctl start certbot.timer")?;

        Ok(())
    }

    /// Configure firewall
    pub fn configure_firewall(&self) -> Result<()> {
        if !self.config.setup_firewall {
            return Ok(());
        }

        println!("Configuring firewall...");

        let session = self.create_ssh_session()?;

        // Enable ufw
        self.execute_command(&session, "sudo ufw --force enable")?;

        // Allow SSH
        self.execute_command(&session, &format!("sudo ufw allow {}", self.config.port))?;

        // Allow HTTP/HTTPS
        self.execute_command(&session, "sudo ufw allow 80/tcp")?;
        self.execute_command(&session, "sudo ufw allow 443/tcp")?;

        // Allow application ports
        self.execute_command(&session, &format!("sudo ufw allow {}/tcp", self.config.frontend_port))?;
        self.execute_command(&session, &format!("sudo ufw allow {}/tcp", self.config.backend_port))?;

        // Reload firewall
        self.execute_command(&session, "sudo ufw reload")?;

        println!("Firewall configured");

        Ok(())
    }

    /// Start services
    pub fn start_services(&self) -> Result<()> {
        println!("Starting services...");

        let session = self.create_ssh_session()?;

        // Start backend
        self.execute_command(&session, "sudo systemctl start agent-player.service")?;

        // Start frontend
        self.execute_command(&session, "sudo systemctl start agent-player-frontend.service")?;

        // Start nginx
        self.execute_command(&session, "sudo systemctl restart nginx")?;

        println!("Services started");

        Ok(())
    }

    /// Check deployment status
    pub fn check_status(&self) -> Result<ServerStatus> {
        let session = self.create_ssh_session()?;

        let mut status = ServerStatus {
            ssh_connected: true,
            dependencies_installed: false,
            files_uploaded: false,
            production_built: false,
            systemd_installed: false,
            nginx_configured: false,
            ssl_configured: false,
            firewall_configured: false,
            services_running: false,
        };

        // Check dependencies
        status.dependencies_installed = self.execute_command(&session, "which node && which pnpm && which nginx").is_ok();

        // Check files uploaded
        status.files_uploaded = self.execute_command(&session, &format!("test -f {}/package.json", self.config.install_path)).is_ok();

        // Check production built
        status.production_built = self.execute_command(&session, &format!("test -d {}/packages/frontend/.next", self.config.install_path)).is_ok();

        // Check systemd services
        status.systemd_installed = self.execute_command(&session, "test -f /etc/systemd/system/agent-player.service").is_ok();

        // Check nginx config
        status.nginx_configured = self.execute_command(&session, "test -f /etc/nginx/sites-enabled/agent-player").is_ok();

        // Check SSL
        if let Some(domain) = &self.config.domain {
            status.ssl_configured = self.execute_command(&session, &format!("test -f /etc/letsencrypt/live/{}/fullchain.pem", domain)).is_ok();
        }

        // Check firewall
        status.firewall_configured = self.execute_command(&session, "sudo ufw status | grep -q active").is_ok();

        // Check services running
        let backend_running = self.execute_command(&session, "sudo systemctl is-active agent-player.service").is_ok();
        let frontend_running = self.execute_command(&session, "sudo systemctl is-active agent-player-frontend.service").is_ok();
        status.services_running = backend_running && frontend_running;

        Ok(status)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_config_serialization() {
        let config = ServerConfig {
            host: "example.com".to_string(),
            port: 22,
            username: "root".to_string(),
            auth: SshAuth::Password { password: "test".to_string() },
            install_path: "/var/www/agent-player".to_string(),
            domain: Some("agent.example.com".to_string()),
            frontend_port: 41521,
            backend_port: 41522,
            setup_ssl: true,
            setup_firewall: true,
        };

        let json = serde_json::to_string(&config).unwrap();
        let deserialized: ServerConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config.host, deserialized.host);
    }
}
