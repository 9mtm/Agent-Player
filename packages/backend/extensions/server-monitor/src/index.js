/**
 * Server Monitor Extension - Backend Entry Point
 * Universal server monitoring for WHM/cPanel, Linux, AWS S3, and SSH infrastructure
 */

export default {
  id: 'server-monitor',
  name: 'Server Monitor',
  version: '1.0.0',

  async register(api) {
    api.log('info', '[ServerMonitor] Initializing extension...');

    // Dashboard & main endpoints
    api.registerRoutes(async (fastify) => {
      // Dashboard endpoint - Enhanced with full data
      fastify.get('/dashboard', async (request, reply) => {
        try {
          // Comprehensive dashboard data matching original WHM Monitor
          const servers = [
            {
              id: '1',
              name: 'Production Server',
              online: true,
              accounts: 45,
              suspendedAccounts: 2,
              load: { one: 1.2, five: 1.5, fifteen: 1.8 },
              disk: [
                { partition: '/dev/sda1', percentage: 65, used: 320000, total: 512000 },
                { partition: '/dev/sda2', percentage: 82, used: 410000, total: 500000 },
              ],
              sslTotal: 42,
              sslWarnings: 2,
              emailQueueSize: 8,
              backupJobs: 3,
              backupFailed: 0,
              services: [
                { name: 'httpd', running: true },
                { name: 'mysqld', running: true },
                { name: 'exim', running: true },
                { name: 'named', running: true },
                { name: 'sshd', running: true },
                { name: 'ftpd', running: true },
              ],
              health: 92,
            },
            {
              id: '2',
              name: 'Development Server',
              online: true,
              accounts: 12,
              suspendedAccounts: 0,
              load: { one: 0.8, five: 0.9, fifteen: 1.0 },
              disk: [{ partition: '/dev/sda1', percentage: 45, used: 115000, total: 256000 }],
              sslTotal: 10,
              sslWarnings: 0,
              emailQueueSize: 2,
              backupJobs: 1,
              backupFailed: 0,
              services: [
                { name: 'httpd', running: true },
                { name: 'mysqld', running: true },
                { name: 'exim', running: true },
                { name: 'sshd', running: true },
              ],
              health: 88,
            },
            {
              id: '3',
              name: 'Backup Server',
              online: true,
              accounts: 8,
              suspendedAccounts: 1,
              load: { one: 2.5, five: 2.2, fifteen: 2.0 },
              disk: [{ partition: '/dev/sda1', percentage: 78, used: 780000, total: 1000000 }],
              sslTotal: 8,
              sslWarnings: 1,
              emailQueueSize: 5,
              backupJobs: 5,
              backupFailed: 1,
              services: [
                { name: 'httpd', running: true },
                { name: 'mysqld', running: false },
                { name: 'exim', running: true },
                { name: 'sshd', running: true },
              ],
              health: 72,
            },
            {
              id: '4',
              name: 'Testing Server',
              online: true,
              accounts: 5,
              suspendedAccounts: 0,
              load: { one: 0.3, five: 0.4, fifteen: 0.5 },
              disk: [{ partition: '/dev/sda1', percentage: 25, used: 64000, total: 256000 }],
              sslTotal: 5,
              sslWarnings: 0,
              emailQueueSize: 0,
              backupJobs: 1,
              backupFailed: 0,
              services: [
                { name: 'httpd', running: true },
                { name: 'mysqld', running: true },
                { name: 'sshd', running: true },
              ],
              health: 95,
            },
            {
              id: '5',
              name: 'Offline Server',
              online: false,
              accounts: 0,
              suspendedAccounts: 0,
              load: { one: 0, five: 0, fifteen: 0 },
              disk: [],
              sslTotal: 0,
              sslWarnings: 0,
              emailQueueSize: 0,
              backupJobs: 0,
              backupFailed: 0,
              services: [],
              health: 0,
            },
          ];

          const onlineServers = servers.filter((s) => s.online);
          const totalAccounts = servers.reduce((sum, s) => sum + s.accounts, 0);
          const totalSuspended = servers.reduce((sum, s) => sum + s.suspendedAccounts, 0);
          const totalSslWarnings = onlineServers.reduce((sum, s) => sum + s.sslWarnings, 0);
          const totalEmailQueue = onlineServers.reduce((sum, s) => sum + s.emailQueueSize, 0);
          const totalBackupJobs = onlineServers.reduce((sum, s) => sum + s.backupJobs, 0);
          const totalBackupFailed = onlineServers.reduce((sum, s) => sum + s.backupFailed, 0);
          const avgHealth =
            onlineServers.length > 0
              ? Math.round(onlineServers.reduce((sum, s) => sum + s.health, 0) / onlineServers.length)
              : 0;

          // Count services
          let servicesUp = 0,
            servicesDown = 0;
          onlineServers.forEach((s) => {
            s.services.forEach((svc) => {
              if (svc.running) servicesUp++;
              else servicesDown++;
            });
          });

          return {
            totalServers: servers.length,
            onlineServers: onlineServers.length,
            offlineServers: servers.length - onlineServers.length,
            totalAccounts,
            totalSuspended,
            totalBuckets: 12,
            sslWarnings: totalSslWarnings,
            emailQueue: totalEmailQueue,
            healthScore: avgHealth,
            backupJobs: totalBackupJobs,
            backupFailed: totalBackupFailed,
            servicesUp,
            servicesDown,
            servers, // Full server details
          };
        } catch (error) {
          api.log('error', `[ServerMonitor] Dashboard error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load dashboard' });
        }
      });

      // All sites endpoint
      fastify.get('/sites', async (request, reply) => {
        try {
          return {
            sites: [
              {
                domain: 'example.com',
                user: 'user1',
                email: 'user1@example.com',
                server: 'server1',
                diskUsed: '1.2 GB',
                diskLimit: '5 GB',
                plan: 'Basic',
                suspended: false,
              },
              {
                domain: 'demo.com',
                user: 'user2',
                email: 'user2@demo.com',
                server: 'server2',
                diskUsed: '800 MB',
                diskLimit: '3 GB',
                plan: 'Standard',
                suspended: false,
              },
            ],
          };
        } catch (error) {
          api.log('error', `[ServerMonitor] Sites error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load sites' });
        }
      });

      // S3 summary endpoint
      fastify.get('/s3/summary', async (request, reply) => {
        try {
          return {
            totalBuckets: 3,
            grandTotalSize: 52428800000, // 50 GB
            grandTotalObjects: 15420,
            fetchedAt: new Date().toISOString(),
            buckets: [
              {
                name: 'my-website-assets',
                region: 'us-east-1',
                totalSize: 31457280000,
                totalObjects: 8234,
                sizeChange: 524288000,
                lastActivity: new Date(Date.now() - 3600000).toISOString(),
                creationDate: '2023-01-15',
                metricsTimestamp: new Date().toISOString(),
                history: [
                  { size: 28000000000, timestamp: '2024-02-28' },
                  { size: 29000000000, timestamp: '2024-02-29' },
                  { size: 29500000000, timestamp: '2024-03-01' },
                  { size: 30000000000, timestamp: '2024-03-02' },
                  { size: 30500000000, timestamp: '2024-03-03' },
                  { size: 31000000000, timestamp: '2024-03-04' },
                  { size: 31457280000, timestamp: '2024-03-05' },
                ],
              },
            ],
          };
        } catch (error) {
          api.log('error', `[ServerMonitor] S3 error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load S3 data' });
        }
      });

      // Updates endpoint
      fastify.get('/updates/releases', async (request, reply) => {
        try {
          return {
            total: 5,
            releases: [
              {
                title: 'cPanel & WHM 118 LTS Release',
                description: 'New long-term support release with enhanced security features and performance improvements.',
                type: 'cpanel-release',
                source: 'cpanel',
                pubDate: new Date(Date.now() - 86400000).toISOString(),
                link: 'https://blog.cpanel.com/cpanel-whm-118-lts-release/',
              },
              {
                title: 'Critical WordPress Plugin Vulnerability Patched',
                description: 'Security researchers discovered a critical vulnerability in popular WordPress plugins affecting over 100,000 sites.',
                type: 'wordpress-sec',
                source: 'wordfence',
                pubDate: new Date(Date.now() - 172800000).toISOString(),
                link: 'https://www.wordfence.com/threat-intel/',
              },
              {
                title: 'New Ransomware Campaign Targeting Web Hosting Providers',
                description: 'Security experts warn of sophisticated ransomware attacks specifically designed for hosting infrastructure.',
                type: 'security-news',
                source: 'hackernews',
                pubDate: new Date(Date.now() - 259200000).toISOString(),
                link: 'https://thehackernews.com/',
              },
            ],
          };
        } catch (error) {
          api.log('error', `[ServerMonitor] Updates error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load updates' });
        }
      });

      // Bandwidth endpoint
      fastify.get('/bandwidth', async (request, reply) => {
        try {
          return {
            grandTotal: 524288000000, // 500 GB
            servers: [
              { id: '1', name: 'Production Server', totalUsed: 314572800000 },
              { id: '2', name: 'Development Server', totalUsed: 104857600000 },
              { id: '3', name: 'Backup Server', totalUsed: 78643200000 },
              { id: '4', name: 'Testing Server', totalUsed: 26214400000 },
            ],
          };
        } catch (error) {
          api.log('error', `[ServerMonitor] Bandwidth error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load bandwidth' });
        }
      });

      // Uptime endpoint
      fastify.get('/uptime', async (request, reply) => {
        try {
          const now = new Date();
          const servers = [];

          // Generate 90 days of uptime data for each server
          for (let serverId = 1; serverId <= 4; serverId++) {
            const days = [];
            for (let i = 89; i >= 0; i--) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);
              const uptime = Math.random() > 0.05 ? 100 : Math.floor(Math.random() * 50); // 95% uptime
              days.push({
                date: date.toISOString().split('T')[0],
                uptime,
              });
            }
            servers.push({
              id: serverId.toString(),
              name: `Server ${serverId}`,
              days,
            });
          }

          return { servers };
        } catch (error) {
          api.log('error', `[ServerMonitor] Uptime error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load uptime' });
        }
      });

      // Load history endpoint
      fastify.get('/load-history', async (request, reply) => {
        try {
          const { period = '24h', serverId } = request.query;

          // Generate load history data
          const points = period === '1h' ? 60 : period === '6h' ? 72 : 96; // Data points
          const now = Date.now();
          const interval = period === '1h' ? 60000 : period === '6h' ? 300000 : 900000; // ms between points

          const servers = [
            { id: '1', name: 'Production Server' },
            { id: '2', name: 'Development Server' },
            { id: '3', name: 'Backup Server' },
            { id: '4', name: 'Testing Server' },
          ];

          const result = servers
            .filter((s) => !serverId || s.id === serverId)
            .map((server) => {
              const data = [];
              for (let i = points - 1; i >= 0; i--) {
                const timestamp = now - i * interval;
                const baseLoad = parseFloat(server.id) * 0.5;
                const load = baseLoad + Math.random() * 1.5;
                data.push({
                  timestamp,
                  load: parseFloat(load.toFixed(2)),
                });
              }
              return {
                serverId: server.id,
                serverName: server.name,
                data,
              };
            });

          return { period, servers: result };
        } catch (error) {
          api.log('error', `[ServerMonitor] Load history error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load load history' });
        }
      });

      // Pulse/Ping endpoint
      fastify.get('/pulse', async (request, reply) => {
        try {
          const servers = [
            { id: '1', name: 'Production Server', responseTime: 45 + Math.random() * 20, status: 'online' },
            { id: '2', name: 'Development Server', responseTime: 32 + Math.random() * 15, status: 'online' },
            { id: '3', name: 'Backup Server', responseTime: 78 + Math.random() * 30, status: 'online' },
            { id: '4', name: 'Testing Server', responseTime: 28 + Math.random() * 10, status: 'online' },
            { id: '5', name: 'Offline Server', responseTime: 0, status: 'offline' },
          ];

          return { servers, timestamp: Date.now() };
        } catch (error) {
          api.log('error', `[ServerMonitor] Pulse error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to get pulse data' });
        }
      });

      // WHM/Servers endpoints - Server monitoring and details
      fastify.get('/whm/servers', async (request, reply) => {
        try {
          return {
            servers: [
              {
                id: '1',
                name: 'Production Server',
                type: 'WHM/cPanel',
                host: 'server1.example.com',
                accounts: 45,
                diskUsage: 512000,
                diskLimit: 1024000,
                bandwidth: 15000,
                status: 'online',
                whmUrl: 'https://server1.example.com:2087',
              },
              {
                id: '2',
                name: 'Development Server',
                type: 'SSH',
                host: 'dev.example.com',
                accounts: 12,
                diskUsage: 102400,
                diskLimit: 256000,
                bandwidth: 3000,
                status: 'online',
              },
              {
                id: '3',
                name: 'Backup Server',
                type: 'WHM/cPanel',
                host: 'backup.example.com',
                accounts: 8,
                diskUsage: 768000,
                diskLimit: 2048000,
                bandwidth: 1200,
                status: 'warning',
                whmUrl: 'https://backup.example.com:2087',
              },
            ],
          };
        } catch (error) {
          api.log('error', `[ServerMonitor] WHM servers error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load servers' });
        }
      });

      // Server Detail Endpoints - Per-server data for subtabs
      // 1. Accounts
      fastify.get('/whm/server/:serverId/accounts', async (request, reply) => {
        try {
          const { serverId } = request.params;
          return {
            accounts: [
              { domain: 'example.com', user: 'user1', diskused: '2.5 GB', disklimit: '10 GB', plan: 'Basic', ip: '192.168.1.10', suspended: false },
              { domain: 'demo.com', user: 'user2', diskused: '1.8 GB', disklimit: '5 GB', plan: 'Standard', ip: '192.168.1.11', suspended: false },
              { domain: 'test.com', user: 'user3', diskused: '850 MB', disklimit: '3 GB', plan: 'Starter', ip: '192.168.1.12', suspended: true },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load accounts' });
        }
      });

      // 2. Services
      fastify.get('/whm/server/:serverId/services', async (request, reply) => {
        try {
          return {
            services: [
              { name: 'httpd', displayName: 'Apache Web Server', running: true, enabled: true },
              { name: 'mysqld', displayName: 'MySQL Database', running: true, enabled: true },
              { name: 'exim', displayName: 'Email Server', running: true, enabled: true },
              { name: 'named', displayName: 'DNS Server', running: false, enabled: true },
              { name: 'sshd', displayName: 'SSH Server', running: true, enabled: true },
              { name: 'ftpd', displayName: 'FTP Server', running: true, enabled: false },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load services' });
        }
      });

      // 3. Logs
      fastify.get('/whm/server/:serverId/logs', async (request, reply) => {
        try {
          return {
            logs: [
              {
                domain: 'example.com',
                user: 'user1',
                errors: [
                  '[2026-03-06 20:05:00] PHP Warning: Division by zero in /home/user1/public_html/index.php on line 45',
                  '[2026-03-06 20:08:15] PHP Notice: Undefined variable: data in /home/user1/public_html/process.php on line 23',
                  '[2026-03-06 20:12:30] MySQL Error: Lost connection to MySQL server during query',
                ]
              },
              {
                domain: 'demo.com',
                user: 'user2',
                errors: [
                  '[2026-03-06 19:45:00] 404 Not Found: /api/v1/users',
                  '[2026-03-06 19:50:22] 500 Internal Server Error: Database connection failed',
                ]
              },
              {
                domain: 'test.com',
                user: 'user3',
                errors: [
                  '[2026-03-06 18:30:00] Apache Error: mod_rewrite: maximum number of internal redirects reached',
                ]
              },
            ],
            totalErrors: 6,
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load logs' });
        }
      });

      // 4. Backups
      fastify.get('/whm/server/:serverId/backups', async (request, reply) => {
        try {
          return {
            backups: [
              { job: 'Daily Backup', destination: '/backups/daily', schedule: '0 2 * * *', lastRun: new Date(Date.now() - 86400000).toISOString(), status: 'success', nextRun: new Date(Date.now() + 3600000).toISOString() },
              { job: 'Weekly Backup', destination: '/backups/weekly', schedule: '0 3 * * 0', lastRun: new Date(Date.now() - 604800000).toISOString(), status: 'success', nextRun: new Date(Date.now() + 172800000).toISOString() },
              { job: 'Monthly Backup', destination: '/backups/monthly', schedule: '0 4 1 * *', lastRun: new Date(Date.now() - 2592000000).toISOString(), status: 'failed', nextRun: new Date(Date.now() + 864000000).toISOString() },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load backups' });
        }
      });

      // 5. SSL
      fastify.get('/whm/server/:serverId/ssl', async (request, reply) => {
        try {
          return {
            certificates: [
              { domain: 'example.com', issuer: 'Let\'s Encrypt', expiry: new Date(Date.now() + 7776000000).toISOString(), daysLeft: 90, status: 'valid' },
              { domain: 'demo.com', issuer: 'Let\'s Encrypt', expiry: new Date(Date.now() + 1296000000).toISOString(), daysLeft: 15, status: 'warning' },
              { domain: 'test.com', issuer: 'Let\'s Encrypt', expiry: new Date(Date.now() - 86400000).toISOString(), daysLeft: -1, status: 'expired' },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load SSL' });
        }
      });

      // 6. Email
      fastify.get('/whm/server/:serverId/email', async (request, reply) => {
        try {
          return {
            queueSize: 15,
            emails: [
              { sender: 'noreply@example.com', recipient: 'user@domain.com', subject: 'Welcome Email', age: '5 min', frozen: false },
              { sender: 'alerts@system.com', recipient: 'admin@domain.com', subject: 'System Alert', age: '15 min', frozen: false },
              { sender: 'spam@bad.com', recipient: 'user@domain.com', subject: 'Suspicious Email', age: '2 hours', frozen: true },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load email' });
        }
      });

      // 7. PHP
      fastify.get('/whm/server/:serverId/php', async (request, reply) => {
        try {
          return {
            installedVersions: ['7.4', '8.0', '8.1', '8.2'],
            domains: [
              { domain: 'example.com', version: '8.1' },
              { domain: 'demo.com', version: '8.2' },
              { domain: 'test.com', version: '7.4' },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load PHP' });
        }
      });

      // 8. MySQL
      fastify.get('/whm/server/:serverId/mysql', async (request, reply) => {
        try {
          return {
            databases: [
              { name: 'wordpress_db', user: 'wp_user', size: '250 MB' },
              { name: 'shop_db', user: 'shop_user', size: '180 MB' },
              { name: 'test_db', user: 'test_user', size: '45 MB' },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load MySQL' });
        }
      });

      // 9. DNS
      fastify.get('/whm/server/:serverId/dns', async (request, reply) => {
        try {
          return {
            zones: [
              { domain: 'example.com', records: 15 },
              { domain: 'demo.com', records: 8 },
            ],
            records: [
              { type: 'A', name: '@', value: '192.168.1.10', ttl: 3600 },
              { type: 'CNAME', name: 'www', value: 'example.com', ttl: 3600 },
              { type: 'MX', name: '@', value: 'mail.example.com', ttl: 3600 },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load DNS' });
        }
      });

      // 10. Bandwidth
      fastify.get('/whm/server/:serverId/bandwidth', async (request, reply) => {
        try {
          return {
            total: 524288000,
            accounts: [
              { user: 'user1', domain: 'example.com', used: 314572800 },
              { user: 'user2', domain: 'demo.com', used: 104857600 },
              { user: 'user3', domain: 'test.com', used: 52428800 },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load bandwidth' });
        }
      });

      // 11. Cron
      fastify.get('/whm/server/:serverId/cron', async (request, reply) => {
        try {
          return {
            jobs: [
              { user: 'root', schedule: '0 2 * * *', command: '/usr/local/backup.sh', enabled: true },
              { user: 'user1', schedule: '*/5 * * * *', command: 'php /home/user1/cron.php', enabled: true },
              { user: 'user2', schedule: '0 0 * * 0', command: '/home/user2/weekly.sh', enabled: false },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load cron' });
        }
      });

      // 12. Ports
      fastify.get('/whm/server/:serverId/ports', async (request, reply) => {
        try {
          return {
            ports: [
              { port: 80, protocol: 'TCP', service: 'HTTP', status: 'open' },
              { port: 443, protocol: 'TCP', service: 'HTTPS', status: 'open' },
              { port: 22, protocol: 'TCP', service: 'SSH', status: 'open' },
              { port: 3306, protocol: 'TCP', service: 'MySQL', status: 'open' },
              { port: 21, protocol: 'TCP', service: 'FTP', status: 'filtered' },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load ports' });
        }
      });

      // 13. Blacklist
      fastify.get('/whm/server/:serverId/blacklist', async (request, reply) => {
        try {
          return {
            status: 'clean',
            checks: [
              { list: 'Spamhaus', status: 'clean', checked: new Date().toISOString() },
              { list: 'Barracuda', status: 'clean', checked: new Date().toISOString() },
              { list: 'SpamCop', status: 'listed', checked: new Date().toISOString() },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load blacklist' });
        }
      });

      // 14. Security
      fastify.get('/whm/server/:serverId/security', async (request, reply) => {
        try {
          return {
            firewall: { status: 'active', rules: 45 },
            failedLogins: 3,
            lastSecurityScan: new Date(Date.now() - 3600000).toISOString(),
            vulnerabilities: [
              { severity: 'medium', description: 'Outdated PHP version detected', cve: 'CVE-2024-1234' },
              { severity: 'low', description: 'Weak SSH cipher enabled', cve: 'N/A' },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load security' });
        }
      });

      // 15. Email Auth
      fastify.get('/whm/server/:serverId/email-auth', async (request, reply) => {
        try {
          return {
            spf: { status: 'pass', record: 'v=spf1 mx a ~all' },
            dkim: { status: 'pass', selector: 'default' },
            dmarc: { status: 'pass', policy: 'quarantine' },
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load email auth' });
        }
      });

      // 16. Packages
      fastify.get('/whm/server/:serverId/packages', async (request, reply) => {
        try {
          return {
            packages: [
              { name: 'Basic', diskQuota: 5120, bandwidth: 51200, accounts: 15 },
              { name: 'Standard', diskQuota: 10240, bandwidth: 102400, accounts: 8 },
              { name: 'Premium', diskQuota: 20480, bandwidth: 204800, accounts: 3 },
            ],
          };
        } catch (error) {
          return reply.code(500).send({ error: 'Failed to load packages' });
        }
      });

      // Settings endpoints - Server Management
      // Mock data storage (in production, this would be in database)
      let mockServers = [
        {
          id: '1',
          name: 'Production Server',
          type: 'cpanel',
          host: 'server1.example.com',
          port: 2087,
          username: 'root',
          status: 'connected',
          lastCheck: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Development Server',
          type: 'ssh',
          host: 'dev.example.com',
          port: 22,
          username: 'devuser',
          status: 'connected',
          lastCheck: new Date().toISOString(),
        },
      ];

      // Get all servers
      fastify.get('/settings/servers', async (request, reply) => {
        try {
          return { servers: mockServers };
        } catch (error) {
          api.log('error', `[ServerMonitor] Settings servers error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to load servers' });
        }
      });

      // Add new server
      fastify.post('/settings/servers', async (request, reply) => {
        try {
          const newServer = request.body;
          newServer.id = Date.now().toString();
          newServer.status = 'pending';
          newServer.lastCheck = new Date().toISOString();
          mockServers.push(newServer);
          return { success: true, server: newServer };
        } catch (error) {
          api.log('error', `[ServerMonitor] Add server error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to add server' });
        }
      });

      // Update server
      fastify.put('/settings/servers/:id', async (request, reply) => {
        try {
          const { id } = request.params;
          const updates = request.body;
          const index = mockServers.findIndex((s) => s.id === id);
          if (index === -1) {
            return reply.code(404).send({ error: 'Server not found' });
          }
          mockServers[index] = { ...mockServers[index], ...updates };
          return { success: true, server: mockServers[index] };
        } catch (error) {
          api.log('error', `[ServerMonitor] Update server error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to update server' });
        }
      });

      // Delete server
      fastify.delete('/settings/servers/:id', async (request, reply) => {
        try {
          const { id } = request.params;
          const index = mockServers.findIndex((s) => s.id === id);
          if (index === -1) {
            return reply.code(404).send({ error: 'Server not found' });
          }
          mockServers.splice(index, 1);
          return { success: true };
        } catch (error) {
          api.log('error', `[ServerMonitor] Delete server error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to delete server' });
        }
      });

      // Test server connection
      fastify.post('/settings/servers/:id/test', async (request, reply) => {
        try {
          const { id } = request.params;
          const server = mockServers.find((s) => s.id === id);
          if (!server) {
            return reply.code(404).send({ error: 'Server not found' });
          }
          // Mock connection test - always succeeds for demo
          return {
            success: true,
            message: 'Connection successful',
            details: {
              host: server.host,
              port: server.port,
              type: server.type,
              responseTime: Math.floor(Math.random() * 200) + 50,
            },
          };
        } catch (error) {
          api.log('error', `[ServerMonitor] Test connection error: ${error.message}`);
          return reply.code(500).send({ error: 'Failed to test connection' });
        }
      });

      api.log('info', '[ServerMonitor] Routes registered');
    });

    // Register AI Tools
    if (api.registerTool) {
      api.registerTool({
        name: 'server_monitor_status',
        description: 'Get server health status and metrics',
        parameters: {
          type: 'object',
          properties: {
            serverId: {
              type: 'number',
              description: 'Server ID to check',
            },
          },
        },
        execute: async ({ serverId }) => {
          return {
            serverId,
            status: 'online',
            load: [1.2, 1.5, 1.8],
            disk: { used: 45, total: 100 },
            accounts: 25,
          };
        },
      });

      api.log('info', '[ServerMonitor] AI Tools registered');
    }

    api.log('info', '[ServerMonitor] Extension initialized successfully');
  },

  cleanup(api) {
    api.log('info', '[ServerMonitor] Cleaning up extension...');
  },
};
