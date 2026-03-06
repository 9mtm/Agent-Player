// ── Translations ──
const i18n = {
  en: {
    nextRefresh: 'Next refresh in',
    refresh: 'Refresh',
    tabS3: 'S3 Storage',
    tabServers: 'Servers',
    // S3
    totalBuckets: 'Total Buckets',
    totalStorage: 'Total Storage',
    totalObjects: 'Total Objects',
    lastChecked: 'Last Checked',
    loading: 'Loading bucket data...',
    retry: 'Retry',
    region: 'Region',
    size: 'Size',
    objects: 'Objects',
    lastActivity: 'Last Activity',
    change24h: '24h Change',
    created: 'Created',
    metricsAsOf: 'Metrics as of',
    empty: 'Empty',
    never: 'Never',
    noChange: 'No change',
    errorPrefix: 'Error: ',
    noData: 'No buckets found in your account.',
    last7days: 'Last 7 days',
    // WHM
    totalServers: 'Total Servers',
    onlineServers: 'Online',
    totalAccounts: 'Total Accounts',
    searchPlaceholder: 'Search accounts across servers...',
    loadingServers: 'Loading server data...',
    serverOffline: 'Server unreachable',
    accounts: 'Accounts',
    load: 'Load (1/5/15m)',
    openWhm: 'Open WHM',
    backToOverview: 'Back to Overview',
    domain: 'Domain',
    user: 'User',
    server: 'Server',
    diskUsed: 'Disk Used',
    diskLimit: 'Disk Limit',
    plan: 'Plan',
    status: 'Status',
    suspended: 'Suspended',
    active: 'Active',
    services: 'Services',
    running: 'Running',
    stopped: 'Stopped',
    logs: 'Logs',
    logNotAvailable: 'Log access not available via API. Use WHM directly.',
    noResults: 'No accounts found for',
    resultsFor: 'results for',
    disk: 'Disk',
    filterAccounts: 'Filter accounts...',
    ip: 'IP',
    email: 'Email',
    // Backups
    backups: 'Backups',
    backupJob: 'Backup Job',
    backupDestination: 'Destination',
    backupSchedule: 'Schedule',
    backupLastRun: 'Last Run',
    backupLastStatus: 'Last Status',
    backupNextRun: 'Next Run',
    backupEnabled: 'Enabled',
    backupDisabled: 'Disabled',
    backupSuccess: 'Success',
    backupFailed: 'Failed',
    backupRunning: 'Running',
    backupNotInstalled: 'JetBackup 5 is not installed on this server.',
    backupNoJobs: 'No backup jobs configured.',
    // SSL
    ssl: 'SSL',
    sslDomain: 'Domain',
    sslIssuer: 'Issuer',
    sslExpiry: 'Expiry Date',
    sslDaysLeft: 'Days Left',
    sslStatus: 'Status',
    sslExpired: 'Expired',
    sslCritical: 'Critical',
    sslWarning: 'Expiring Soon',
    sslOk: 'Valid',
    sslNoCerts: 'No SSL certificates found.',
    sslWarnings: 'SSL Warnings',
    // Email Queue
    emailQueue: 'Email Queue',
    emailQueueSize: 'Queue Size',
    emailSender: 'Sender',
    emailRecipient: 'Recipient',
    emailSubject: 'Subject',
    emailFrozen: 'Frozen',
    emailAge: 'Age',
    emailNoQueue: 'Email queue is empty.',
    emailNotAvailable: 'Email queue info not available via API.',
    // Updates / Release Notes
    tabUpdates: 'Updates',
    totalReleases: 'Total Releases',
    loadingReleases: 'Loading release notes...',
    searchReleases: 'Filter releases...',
    releaseAll: 'All',
    releaseCpanel: 'cPanel/WHM',
    releaseEasyapache: 'EasyApache',
    releaseWordpress: 'WP Toolkit',
    releaseSecurity: 'Security',
    releaseBackup: 'Backup',
    releaseWebserver: 'Web Server',
    releaseCloudlinux: 'CloudLinux',
    releaseMonitoring: 'Monitoring',
    releaseOther: 'Other',
    releaseVulnerability: 'Vulnerabilities',
    releaseWpSec: 'WordPress Security',
    releaseCisa: 'CISA Alerts',
    readMore: 'Read more',
    noReleases: 'No releases found.',
    // PHP
    php: 'PHP',
    phpInstalled: 'Installed Versions',
    phpDomains: 'Domains',
    phpVersion: 'PHP Version',
    phpNotAvailable: 'PHP version info not available.',
    // MySQL
    mysql: 'MySQL',
    mysqlDatabases: 'Databases',
    mysqlUsers: 'Users with DBs',
    mysqlDbName: 'Database Name',
    mysqlNotAvailable: 'MySQL info not available.',
    // Alerts
    alerts: 'Alerts',
    noAlerts: 'No alerts',
    alertSslExpiring: 'SSL certificates expiring',
    alertServiceDown: 'Services down',
    alertDiskHigh: 'Disk usage high',
    alertEmailQueue: 'Email queue high',
    // Export
    exportCSV: 'Export CSV',
    // Health Score
    healthScore: 'Health',
    // DNS
    dns: 'DNS',
    dnsZones: 'DNS Zones',
    dnsRecords: 'Records',
    dnsType: 'Type',
    dnsName: 'Name',
    dnsValue: 'Value',
    dnsTTL: 'TTL',
    dnsNotAvailable: 'DNS info not available via API.',
    dnsSelectZone: 'Select a zone to view records',
    dnsBackToZones: 'Back to zones',
    // Bandwidth
    bandwidth: 'Bandwidth',
    bwUsed: 'Used',
    bwLimit: 'Limit',
    bwUnlimited: 'Unlimited',
    bwNotAvailable: 'Bandwidth info not available via API.',
    bwServerTotal: 'Server Total',
    // Packages
    packages: 'Packages',
    pkgName: 'Package Name',
    pkgDiskQuota: 'Disk Quota',
    pkgAddon: 'Addon Domains',
    pkgEmail: 'Email Accounts',
    pkgSql: 'SQL Databases',
    pkgFtp: 'FTP Accounts',
    pkgShell: 'Shell Access',
    pkgYes: 'Yes',
    pkgNo: 'No',
    pkgNotAvailable: 'Package info not available.',
    pkgNone: 'No packages found.',
    // Dashboard Bandwidth
    dashBandwidth: 'Bandwidth',
    dashBwMonth: 'Current Month',
    dashBwTotal: 'total',
    // Enhanced Backups
    backupDestinations: 'Destinations',
    backupSchedules: 'Schedules',
    backupRecentLogs: 'Recent Logs',
    backupDestType: 'Type',
    backupDiskUsage: 'Disk Usage',
    backupFrequency: 'Frequency',
    backupDuration: 'Duration',
    backupWarning: 'Warning',
    backupStatus: 'Status',
    backupJobName: 'Job',
    date: 'Date',
    // Cron
    cron: 'Cron Jobs',
    cronCommand: 'Command',
    cronSchedule: 'Schedule',
    cronNotAvailable: 'Cron info not available via API.',
    cronNoJobs: 'No cron jobs found.',
    // Ports
    ports: 'Ports',
    portsOpen: 'Open',
    portsClosed: 'Closed',
    portsScanned: 'Scanned',
    portsPort: 'Port',
    portsService: 'Service',
    portsProtocol: 'Protocol',
    portsStatus: 'Status',
    portsCategory: 'Category',
    portsCatWeb: 'Web',
    portsCatEmail: 'Email',
    portsCatAdmin: 'Admin',
    portsCatFile: 'File Transfer',
    portsCatDns: 'DNS',
    portsCatCpanel: 'cPanel/WHM',
    portsCatDatabase: 'Database',
    portsScanning: 'Scanning ports...',
    portsNotAvailable: 'Port scan not available.',
    // Blacklist (RBL)
    blacklist: 'Blacklist',
    blacklistListed: 'Listed',
    blacklistClean: 'Clean',
    blacklistProvider: 'Provider',
    blacklistIp: 'Server IP',
    blacklistListedOn: 'Listed on',
    blacklistAllClear: 'Not listed on any blacklist.',
    blacklistNotAvailable: 'Blacklist check not available.',
    // Security
    security: 'Security',
    securityServices: 'Security Services',
    securityRunning: 'Running',
    securityStopped: 'Stopped',
    securityDisabled: 'Disabled',
    securityEnabled: 'Enabled',
    securityTwoFactor: 'Two-Factor Authentication',
    securityTwoFactorEnabled: '2FA policy is enabled on this server.',
    securityTwoFactorDisabled: '2FA policy is not enabled. Consider enabling it for better security.',
    securityTwoFactorUnavailable: '2FA status could not be determined.',
    securityNoServices: 'Service status not available for this server.',
    securitySummary: '{running} running, {stopped} stopped',
    // Email Auth
    emailAuth: 'Email Auth',
    emailAuthDomain: 'Domain',
    emailAuthSpf: 'SPF',
    emailAuthDkim: 'DKIM',
    emailAuthDmarc: 'DMARC',
    emailAuthFound: 'Found',
    emailAuthMissing: 'Missing',
    emailAuthNotAvailable: 'Email authentication check not available.',
    // Uptime
    dashUptime: 'Uptime',
    dashUptime24h: '24h',
    dashUptime7d: '7 days',
    dashUptime30d: '30 days',
    dashUptimeNoData: 'No uptime data yet. Data collection starts automatically.',
    // Load History
    dashLoadHistory: 'Load History',
    dashLoadHistoryNoData: 'No load history data yet.',
    dashLoadHistory1h: '1h',
    dashLoadHistory6h: '6h',
    dashLoadHistory24h: '24h',
    // All Sites
    tabAllSites: 'All Sites',
    totalSites: 'Total Sites',
    loadingSites: 'Loading all sites...',
    searchAllSites: 'Search domains, users, emails...',
    allSitesFilterAll: 'All Servers',
    allSitesDomain: 'Domain',
    allSitesUser: 'User',
    allSitesDiskUsed: 'Disk Used',
    allSitesPlan: 'Plan',
    allSitesServer: 'Server',
    allSitesStatus: 'Status',
    allSitesActive: 'Active',
    allSitesSuspended: 'Suspended',
    allSitesNoResults: 'No sites match your search.',
    // Dashboard
    tabDashboard: 'Dashboard',
    dashLoading: 'Loading dashboard...',
    dashTitle: 'Infrastructure Overview',
    dashServers: 'Servers',
    dashAccounts: 'Accounts',
    dashS3Buckets: 'S3 Buckets',
    dashS3Storage: 'S3 Storage',
    dashHealthAvg: 'Avg Health',
    dashSslCerts: 'SSL Certs',
    dashSslWarnings: 'Warnings',
    dashEmailQueued: 'Email Queued',
    dashBackupJobs: 'Backup Jobs',
    dashServerHealth: 'Server Health',
    dashDiskUsage: 'Disk Usage',
    dashSslOverview: 'SSL Overview',
    dashServicesStatus: 'Services Status',
    dashQuickStats: 'Quick Stats',
    dashAlertsSummary: 'Alerts Summary',
    dashAllHealthy: 'All systems healthy',
    dashServicesUp: 'services running',
    dashServicesDown: 'services down',
    dashCertsValid: 'certificates valid',
    dashCertsExpiring: 'expiring soon',
    dashViewDetails: 'View Details',
    dashOnline: 'Online',
    dashOffline: 'Offline',
    dashLatestUpdates: 'Latest Updates',
    dashDiskTotal: 'Total',
    dashDiskFree: 'Free',
    // Pulse Monitor
    dashPulse: 'Server Pulse',
    dashPulseLive: 'LIVE',
    dashPulseMs: 'ms',
    dashPulseOffline: 'OFFLINE',
    dashPulseStable: 'Stable',
    dashPulseUnstable: 'Unstable',
    dashPulseDown: 'Down',
    // Settings
    tabSettings: 'Settings',
    settSiteConfig: 'Site Configuration',
    settSiteName: 'Site Name',
    settSave: 'Save',
    settCancel: 'Cancel',
    settDelete: 'Delete',
    settServers: 'Servers',
    settAddServer: 'Add Server',
    settEditServer: 'Edit Server',
    settServerName: 'Name',
    settServerHost: 'Host',
    settServerPort: 'Port',
    settServerType: 'Type',
    settServerUser: 'User',
    settServerToken: 'API Token',
    settServerPassword: 'Password',
    settServerApiKey: 'API Key',
    settServerPrivateKey: 'Private Key',
    settServerUrl: 'URL',
    settServerMethod: 'Method',
    settServerExpectedStatus: 'Expected Status',
    settServerInterval: 'Interval (s)',
    settServerDiskGB: 'Total Disk (GB)',
    settServerEnabled: 'Enabled',
    settServerAuthType: 'Auth Type',
    settServerRealm: 'Realm',
    settTestConnection: 'Test Connection',
    settTesting: 'Testing...',
    settTestSuccess: 'Connection successful',
    settTestFailed: 'Connection failed',
    settNoServers: 'No servers configured yet. Click "Add Server" to get started.',
    settSaved: 'Saved successfully',
    settDeleted: 'Server deleted',
    settConfirmDelete: 'Are you sure you want to delete this server?',
    settComingSoon: 'Coming Soon',
    settCredentialKept: 'Leave empty to keep current',
    settServerAccessLevel: 'Access Level',
    settAccessReadonly: 'Read-Only',
    settAccessReadwrite: 'Read-Write',
    settAccessHint: 'Read-Write allows management actions (restart services, SSH, etc.)',
    // SSH Terminal
    sshTerminal: 'Terminal',
    sshFtp: 'FTP',
    sshConnect: 'Connect',
    sshDisconnect: 'Disconnect',
    sshConnected: 'Connected',
    sshDisconnected: 'Disconnected',
    sshConnecting: 'Connecting...',
    sshConnectionError: 'Connection error',
    sshAccessDenied: 'SSH Terminal requires Read-Write access level.',
    sshSection: 'SSH Access (Optional)',
    sshHostLabel: 'SSH Host',
    sshHostPlaceholder: 'Same as main host if empty',
    sshBadge: 'SSH',
    sshPassphraseLabel: 'Key Passphrase',
    // SFTP
    sftpName: 'Name',
    sftpSize: 'Size',
    sftpModified: 'Modified',
    sftpPermissions: 'Permissions',
    sftpUpload: 'Upload',
    sftpDownload: 'Download',
    sftpDelete: 'Delete',
    sftpRename: 'Rename',
    sftpNewFolder: 'New Folder',
    sftpNewFile: 'New File',
    sftpRefresh: 'Refresh',
    sftpConfirmDelete: 'Are you sure you want to delete',
    sftpDropHint: 'Drop files here to upload',
    sftpNoFiles: 'Directory is empty.',
    sftpParentDir: 'Parent Directory',
    sftpChmod: 'Permissions',
    sftpChmodTitle: 'Change Permissions',
    sftpEnterName: 'Enter name',
    sftpNewNameTitle: 'Rename',
    sftpNewFolderTitle: 'New Folder',
    sftpNewFileTitle: 'New File',
    sftpOwner: 'Owner',
    sftpGroup: 'Group',
    sftpOthers: 'Others',
    sftpRead: 'Read',
    sftpWrite: 'Write',
    sftpExecute: 'Execute',
    sftpApply: 'Apply',
    sftpCancel: 'Cancel',
    sftpCompress: 'Compress',
    sftpExtract: 'Extract',
    sftpCompressTitle: 'Compress to archive',
    sftpExtractTitle: 'Extract archive',
    sftpArchiveName: 'Archive name',
    sftpSelectAll: 'Select all',
    sftpSelected: 'selected',
    sftpDeleteSelected: 'Delete selected',
    sftpCompressSelected: 'Compress selected',
    sftpMoveTo: 'Move to',
    sftpCopyTo: 'Copy to',
    sftpMoveTitle: 'Move items',
    sftpCopyTitle: 'Copy items',
    sftpDestination: 'Destination path',
    sftpSearch: 'Filter files...',
    sftpShowHidden: 'Hidden files',
    sftpCopyPath: 'Copy path',
    sftpPathCopied: 'Path copied!',
    sftpOpen: 'Open',
    sftpEdit: 'Edit',
    sftpItems: 'items',
    sftpTotalSize: 'Total',
    sftpSortName: 'Name',
    sftpUploading: 'Uploading',
    // Sync
    syncButton: 'Sync',
    syncChooseFolder: 'Choose Local Folder',
    syncLocalFiles: 'Local',
    syncServerFiles: 'Server',
    syncClose: 'Close Sync',
    syncUploadAll: 'Upload All Changed',
    syncDownloadAll: 'Download All Changed',
    syncUploadSelected: 'Upload Selected',
    syncDownloadSelected: 'Download Selected',
    syncStatusSame: 'Same',
    syncStatusModified: 'Modified',
    syncStatusLocalOnly: 'New (Local)',
    syncStatusServerOnly: 'New (Server)',
    syncStatusLocalNewer: 'Newer (Local)',
    syncStatusServerNewer: 'Newer (Server)',
    syncNoChanges: 'All files are in sync.',
    syncProgress: 'Syncing',
    syncComplete: 'Sync complete!',
    syncFailed: 'Sync failed',
    syncComparing: 'Comparing files...',
    syncNotSupported: 'Your browser does not support the File System Access API. Use Chrome or Edge.',
    syncFilterChanged: 'Changed Only',
    syncRefresh: 'Refresh',
    // Editor
    editorSave: 'Save',
    editorSaving: 'Saving...',
    editorSaved: 'Saved',
    editorSaveFailed: 'Save failed',
    editorClose: 'Close',
    editorFileTooLarge: 'File too large for editor (max 2MB).',
    editorUnsavedChanges: 'You have unsaved changes. Discard?',
    editorReadOnly: 'Read-only (set access to Read-Write to edit)',
    editorSelectFile: 'Select a file from the Files tab to edit.',
  },
  de: {
    nextRefresh: 'Aktualisierung in',
    refresh: 'Aktualisieren',
    tabS3: 'S3 Speicher',
    tabServers: 'Server',
    // S3
    totalBuckets: 'Buckets gesamt',
    totalStorage: 'Gesamtspeicher',
    totalObjects: 'Objekte gesamt',
    lastChecked: 'Zuletzt geprüft',
    loading: 'Lade Bucket-Daten...',
    retry: 'Wiederholen',
    region: 'Region',
    size: 'Größe',
    objects: 'Objekte',
    lastActivity: 'Letzte Aktivität',
    change24h: '24h Änderung',
    created: 'Erstellt',
    metricsAsOf: 'Daten vom',
    empty: 'Leer',
    never: 'Nie',
    noChange: 'Keine Änderung',
    errorPrefix: 'Fehler: ',
    noData: 'Keine Buckets gefunden.',
    last7days: 'Letzte 7 Tage',
    // WHM
    totalServers: 'Server gesamt',
    onlineServers: 'Online',
    totalAccounts: 'Konten gesamt',
    searchPlaceholder: 'Konten serverübergreifend suchen...',
    loadingServers: 'Lade Server-Daten...',
    serverOffline: 'Server nicht erreichbar',
    accounts: 'Konten',
    load: 'Last (1/5/15m)',
    openWhm: 'WHM öffnen',
    backToOverview: 'Zurück zur Übersicht',
    domain: 'Domain',
    user: 'Benutzer',
    server: 'Server',
    diskUsed: 'Belegt',
    diskLimit: 'Limit',
    plan: 'Paket',
    status: 'Status',
    suspended: 'Gesperrt',
    active: 'Aktiv',
    services: 'Dienste',
    running: 'Läuft',
    stopped: 'Gestoppt',
    logs: 'Protokolle',
    logNotAvailable: 'Protokollzugriff über API nicht verfügbar.',
    noResults: 'Keine Konten gefunden für',
    resultsFor: 'Ergebnisse für',
    disk: 'Speicher',
    filterAccounts: 'Konten filtern...',
    ip: 'IP',
    email: 'E-Mail',
    // Backups
    backups: 'Backups',
    backupJob: 'Backup-Auftrag',
    backupDestination: 'Ziel',
    backupSchedule: 'Zeitplan',
    backupLastRun: 'Letzte Ausführung',
    backupLastStatus: 'Letzter Status',
    backupNextRun: 'Nächste Ausführung',
    backupEnabled: 'Aktiv',
    backupDisabled: 'Deaktiviert',
    backupSuccess: 'Erfolgreich',
    backupFailed: 'Fehlgeschlagen',
    backupRunning: 'Läuft',
    backupNotInstalled: 'JetBackup 5 ist auf diesem Server nicht installiert.',
    backupNoJobs: 'Keine Backup-Aufträge konfiguriert.',
    // SSL
    ssl: 'SSL',
    sslDomain: 'Domain',
    sslIssuer: 'Aussteller',
    sslExpiry: 'Ablaufdatum',
    sslDaysLeft: 'Tage übrig',
    sslStatus: 'Status',
    sslExpired: 'Abgelaufen',
    sslCritical: 'Kritisch',
    sslWarning: 'Läuft bald ab',
    sslOk: 'Gültig',
    sslNoCerts: 'Keine SSL-Zertifikate gefunden.',
    sslWarnings: 'SSL-Warnungen',
    // Email Queue
    emailQueue: 'E-Mail-Warteschlange',
    emailQueueSize: 'Warteschlangengröße',
    emailSender: 'Absender',
    emailRecipient: 'Empfänger',
    emailSubject: 'Betreff',
    emailFrozen: 'Eingefroren',
    emailAge: 'Alter',
    emailNoQueue: 'E-Mail-Warteschlange ist leer.',
    emailNotAvailable: 'Warteschlangen-Info über API nicht verfügbar.',
    // Updates / Release Notes
    tabUpdates: 'Updates',
    totalReleases: 'Releases gesamt',
    loadingReleases: 'Lade Release-Notizen...',
    searchReleases: 'Releases filtern...',
    releaseAll: 'Alle',
    releaseCpanel: 'cPanel/WHM',
    releaseEasyapache: 'EasyApache',
    releaseWordpress: 'WP Toolkit',
    releaseSecurity: 'Sicherheit',
    releaseBackup: 'Backup',
    releaseWebserver: 'Webserver',
    releaseCloudlinux: 'CloudLinux',
    releaseMonitoring: 'Monitoring',
    releaseOther: 'Sonstige',
    releaseVulnerability: 'Schwachstellen',
    releaseWpSec: 'WordPress Sicherheit',
    releaseCisa: 'CISA Warnungen',
    readMore: 'Weiterlesen',
    noReleases: 'Keine Releases gefunden.',
    // PHP
    php: 'PHP',
    phpInstalled: 'Installierte Versionen',
    phpDomains: 'Domains',
    phpVersion: 'PHP Version',
    phpNotAvailable: 'PHP-Versioninfo nicht verfügbar.',
    // MySQL
    mysql: 'MySQL',
    mysqlDatabases: 'Datenbanken',
    mysqlUsers: 'Benutzer mit DBs',
    mysqlDbName: 'Datenbankname',
    mysqlNotAvailable: 'MySQL-Info nicht verfügbar.',
    // Alerts
    alerts: 'Warnungen',
    noAlerts: 'Keine Warnungen',
    alertSslExpiring: 'SSL-Zertifikate laufen ab',
    alertServiceDown: 'Dienste ausgefallen',
    alertDiskHigh: 'Speicherplatz kritisch',
    alertEmailQueue: 'E-Mail-Warteschlange hoch',
    // Export
    exportCSV: 'CSV Export',
    // Health Score
    healthScore: 'Zustand',
    // DNS
    dns: 'DNS',
    dnsZones: 'DNS-Zonen',
    dnsRecords: 'Einträge',
    dnsType: 'Typ',
    dnsName: 'Name',
    dnsValue: 'Wert',
    dnsTTL: 'TTL',
    dnsNotAvailable: 'DNS-Info über API nicht verfügbar.',
    dnsSelectZone: 'Zone auswählen um Einträge anzuzeigen',
    dnsBackToZones: 'Zurück zu Zonen',
    // Bandwidth
    bandwidth: 'Bandbreite',
    bwUsed: 'Verbraucht',
    bwLimit: 'Limit',
    bwUnlimited: 'Unbegrenzt',
    bwNotAvailable: 'Bandbreiten-Info über API nicht verfügbar.',
    bwServerTotal: 'Server gesamt',
    // Packages
    packages: 'Pakete',
    pkgName: 'Paketname',
    pkgDiskQuota: 'Speicherkontingent',
    pkgAddon: 'Addon-Domains',
    pkgEmail: 'E-Mail-Konten',
    pkgSql: 'SQL-Datenbanken',
    pkgFtp: 'FTP-Konten',
    pkgShell: 'Shell-Zugang',
    pkgYes: 'Ja',
    pkgNo: 'Nein',
    pkgNotAvailable: 'Paketinfo nicht verfügbar.',
    pkgNone: 'Keine Pakete gefunden.',
    // Dashboard Bandwidth
    dashBandwidth: 'Bandbreite',
    dashBwMonth: 'Aktueller Monat',
    dashBwTotal: 'gesamt',
    // Enhanced Backups
    backupDestinations: 'Ziele',
    backupSchedules: 'Zeitpläne',
    backupRecentLogs: 'Letzte Logs',
    backupDestType: 'Typ',
    backupDiskUsage: 'Speichernutzung',
    backupFrequency: 'Häufigkeit',
    backupDuration: 'Dauer',
    backupWarning: 'Warnung',
    backupStatus: 'Status',
    backupJobName: 'Job',
    date: 'Datum',
    // Cron
    cron: 'Cron Jobs',
    cronCommand: 'Befehl',
    cronSchedule: 'Zeitplan',
    cronNotAvailable: 'Cron-Info über API nicht verfügbar.',
    cronNoJobs: 'Keine Cron-Jobs gefunden.',
    // Ports
    ports: 'Ports',
    portsOpen: 'Offen',
    portsClosed: 'Geschlossen',
    portsScanned: 'Gescannt',
    portsPort: 'Port',
    portsService: 'Dienst',
    portsProtocol: 'Protokoll',
    portsStatus: 'Status',
    portsCategory: 'Kategorie',
    portsCatWeb: 'Web',
    portsCatEmail: 'E-Mail',
    portsCatAdmin: 'Admin',
    portsCatFile: 'Dateitransfer',
    portsCatDns: 'DNS',
    portsCatCpanel: 'cPanel/WHM',
    portsCatDatabase: 'Datenbank',
    portsScanning: 'Ports werden gescannt...',
    portsNotAvailable: 'Port-Scan nicht verfügbar.',
    // Blacklist
    blacklist: 'Blacklist',
    blacklistListed: 'Gelistet',
    blacklistClean: 'Sauber',
    blacklistProvider: 'Anbieter',
    blacklistIp: 'Server-IP',
    blacklistListedOn: 'Gelistet auf',
    blacklistAllClear: 'Auf keiner Blacklist gelistet.',
    blacklistNotAvailable: 'Blacklist-Prüfung nicht verfügbar.',
    // Security
    security: 'Sicherheit',
    securityServices: 'Sicherheitsdienste',
    securityRunning: 'Läuft',
    securityStopped: 'Gestoppt',
    securityDisabled: 'Deaktiviert',
    securityEnabled: 'Aktiviert',
    securityTwoFactor: 'Zwei-Faktor-Authentifizierung',
    securityTwoFactorEnabled: '2FA-Richtlinie ist auf diesem Server aktiviert.',
    securityTwoFactorDisabled: '2FA-Richtlinie ist nicht aktiviert. Erwägen Sie die Aktivierung für bessere Sicherheit.',
    securityTwoFactorUnavailable: '2FA-Status konnte nicht ermittelt werden.',
    securityNoServices: 'Dienststatus für diesen Server nicht verfügbar.',
    securitySummary: '{running} aktiv, {stopped} gestoppt',
    // Email Auth
    emailAuth: 'E-Mail-Auth',
    emailAuthDomain: 'Domain',
    emailAuthSpf: 'SPF',
    emailAuthDkim: 'DKIM',
    emailAuthDmarc: 'DMARC',
    emailAuthFound: 'Vorhanden',
    emailAuthMissing: 'Fehlt',
    emailAuthNotAvailable: 'E-Mail-Authentifizierungsprüfung nicht verfügbar.',
    // Uptime
    dashUptime: 'Verfügbarkeit',
    dashUptime24h: '24h',
    dashUptime7d: '7 Tage',
    dashUptime30d: '30 Tage',
    dashUptimeNoData: 'Noch keine Verfügbarkeitsdaten. Datenerfassung startet automatisch.',
    // Load History
    dashLoadHistory: 'Lastverlauf',
    dashLoadHistoryNoData: 'Noch keine Lastverlaufsdaten.',
    dashLoadHistory1h: '1h',
    dashLoadHistory6h: '6h',
    dashLoadHistory24h: '24h',
    // All Sites
    tabAllSites: 'Alle Seiten',
    totalSites: 'Alle Seiten',
    loadingSites: 'Lade alle Seiten...',
    searchAllSites: 'Domains, Benutzer, E-Mails suchen...',
    allSitesFilterAll: 'Alle Server',
    allSitesDomain: 'Domain',
    allSitesUser: 'Benutzer',
    allSitesDiskUsed: 'Speicher',
    allSitesPlan: 'Paket',
    allSitesServer: 'Server',
    allSitesStatus: 'Status',
    allSitesActive: 'Aktiv',
    allSitesSuspended: 'Gesperrt',
    allSitesNoResults: 'Keine Seiten gefunden.',
    // Dashboard
    tabDashboard: 'Dashboard',
    dashLoading: 'Lade Dashboard...',
    dashTitle: 'Infrastruktur-Übersicht',
    dashServers: 'Server',
    dashAccounts: 'Konten',
    dashS3Buckets: 'S3 Buckets',
    dashS3Storage: 'S3 Speicher',
    dashHealthAvg: 'Ø Zustand',
    dashSslCerts: 'SSL-Zertifikate',
    dashSslWarnings: 'Warnungen',
    dashEmailQueued: 'E-Mails in Warteschlange',
    dashBackupJobs: 'Backup-Aufträge',
    dashServerHealth: 'Server-Zustand',
    dashDiskUsage: 'Speichernutzung',
    dashSslOverview: 'SSL-Übersicht',
    dashServicesStatus: 'Dienste-Status',
    dashQuickStats: 'Schnellübersicht',
    dashAlertsSummary: 'Warnungen',
    dashAllHealthy: 'Alle Systeme gesund',
    dashServicesUp: 'Dienste laufen',
    dashServicesDown: 'Dienste ausgefallen',
    dashCertsValid: 'Zertifikate gültig',
    dashCertsExpiring: 'laufen bald ab',
    dashViewDetails: 'Details anzeigen',
    dashOnline: 'Online',
    dashOffline: 'Offline',
    dashLatestUpdates: 'Letzte Updates',
    dashDiskTotal: 'Gesamt',
    dashDiskFree: 'Frei',
    // Pulse Monitor
    dashPulse: 'Server-Puls',
    dashPulseLive: 'LIVE',
    dashPulseMs: 'ms',
    dashPulseOffline: 'OFFLINE',
    dashPulseStable: 'Stabil',
    dashPulseUnstable: 'Instabil',
    dashPulseDown: 'Ausgefallen',
    // Settings
    tabSettings: 'Einstellungen',
    settSiteConfig: 'Seitenkonfiguration',
    settSiteName: 'Seitenname',
    settSave: 'Speichern',
    settCancel: 'Abbrechen',
    settDelete: 'Löschen',
    settServers: 'Server',
    settAddServer: 'Server hinzufügen',
    settEditServer: 'Server bearbeiten',
    settServerName: 'Name',
    settServerHost: 'Host',
    settServerPort: 'Port',
    settServerType: 'Typ',
    settServerUser: 'Benutzer',
    settServerToken: 'API-Token',
    settServerPassword: 'Passwort',
    settServerApiKey: 'API-Schlüssel',
    settServerPrivateKey: 'Privater Schlüssel',
    settServerUrl: 'URL',
    settServerMethod: 'Methode',
    settServerExpectedStatus: 'Erwarteter Status',
    settServerInterval: 'Intervall (s)',
    settServerDiskGB: 'Gesamtspeicher (GB)',
    settServerEnabled: 'Aktiviert',
    settServerAuthType: 'Auth-Typ',
    settServerRealm: 'Realm',
    settTestConnection: 'Verbindung testen',
    settTesting: 'Teste...',
    settTestSuccess: 'Verbindung erfolgreich',
    settTestFailed: 'Verbindung fehlgeschlagen',
    settNoServers: 'Noch keine Server konfiguriert. Klicke "Server hinzufügen" um zu beginnen.',
    settSaved: 'Erfolgreich gespeichert',
    settDeleted: 'Server gelöscht',
    settConfirmDelete: 'Möchten Sie diesen Server wirklich löschen?',
    settComingSoon: 'Demnächst',
    settCredentialKept: 'Leer lassen um aktuellen Wert zu behalten',
    settServerAccessLevel: 'Zugriffsebene',
    settAccessReadonly: 'Nur Lesen',
    settAccessReadwrite: 'Lesen & Schreiben',
    settAccessHint: 'Lesen & Schreiben erlaubt Verwaltungsaktionen (Dienste neustarten, SSH, etc.)',
    // SSH Terminal
    sshTerminal: 'Terminal',
    sshFtp: 'FTP',
    sshConnect: 'Verbinden',
    sshDisconnect: 'Trennen',
    sshConnected: 'Verbunden',
    sshDisconnected: 'Getrennt',
    sshConnecting: 'Verbinde...',
    sshConnectionError: 'Verbindungsfehler',
    sshAccessDenied: 'SSH-Terminal erfordert Lese-/Schreibzugriff.',
    sshSection: 'SSH-Zugang (Optional)',
    sshHostLabel: 'SSH-Host',
    sshHostPlaceholder: 'Gleich wie Haupthost wenn leer',
    sshBadge: 'SSH',
    sshPassphraseLabel: 'Schlüssel-Passphrase',
    // SFTP
    sftpName: 'Name',
    sftpSize: 'Gr\u00f6\u00dfe',
    sftpModified: 'Ge\u00e4ndert',
    sftpPermissions: 'Berechtigungen',
    sftpUpload: 'Hochladen',
    sftpDownload: 'Herunterladen',
    sftpDelete: 'L\u00f6schen',
    sftpRename: 'Umbenennen',
    sftpNewFolder: 'Neuer Ordner',
    sftpNewFile: 'Neue Datei',
    sftpRefresh: 'Aktualisieren',
    sftpConfirmDelete: 'M\u00f6chten Sie wirklich l\u00f6schen',
    sftpDropHint: 'Dateien hier ablegen zum Hochladen',
    sftpNoFiles: 'Verzeichnis ist leer.',
    sftpParentDir: '\u00dcbergeordnetes Verzeichnis',
    sftpChmod: 'Berechtigungen',
    sftpChmodTitle: 'Berechtigungen \u00e4ndern',
    sftpEnterName: 'Name eingeben',
    sftpNewNameTitle: 'Umbenennen',
    sftpNewFolderTitle: 'Neuer Ordner',
    sftpNewFileTitle: 'Neue Datei',
    sftpOwner: 'Eigent\u00fcmer',
    sftpGroup: 'Gruppe',
    sftpOthers: 'Andere',
    sftpRead: 'Lesen',
    sftpWrite: 'Schreiben',
    sftpExecute: 'Ausf\u00fchren',
    sftpApply: 'Anwenden',
    sftpCancel: 'Abbrechen',
    sftpCompress: 'Komprimieren',
    sftpExtract: 'Entpacken',
    sftpCompressTitle: 'Zu Archiv komprimieren',
    sftpExtractTitle: 'Archiv entpacken',
    sftpArchiveName: 'Archivname',
    sftpSelectAll: 'Alle ausw\u00e4hlen',
    sftpSelected: 'ausgew\u00e4hlt',
    sftpDeleteSelected: 'Ausgew\u00e4hlte l\u00f6schen',
    sftpCompressSelected: 'Ausgew\u00e4hlte komprimieren',
    sftpMoveTo: 'Verschieben nach',
    sftpCopyTo: 'Kopieren nach',
    sftpMoveTitle: 'Elemente verschieben',
    sftpCopyTitle: 'Elemente kopieren',
    sftpDestination: 'Zielpfad',
    sftpSearch: 'Dateien filtern...',
    sftpShowHidden: 'Versteckte Dateien',
    sftpCopyPath: 'Pfad kopieren',
    sftpPathCopied: 'Pfad kopiert!',
    sftpOpen: '\u00d6ffnen',
    sftpEdit: 'Bearbeiten',
    sftpItems: 'Elemente',
    sftpTotalSize: 'Gesamt',
    sftpSortName: 'Name',
    sftpUploading: 'Hochladen',
    // Sync
    syncButton: 'Synchronisieren',
    syncChooseFolder: 'Lokalen Ordner w\u00e4hlen',
    syncLocalFiles: 'Lokal',
    syncServerFiles: 'Server',
    syncClose: 'Sync schlie\u00dfen',
    syncUploadAll: 'Alle hochladen',
    syncDownloadAll: 'Alle herunterladen',
    syncUploadSelected: 'Ausgew\u00e4hlte hochladen',
    syncDownloadSelected: 'Ausgew\u00e4hlte herunterladen',
    syncStatusSame: 'Gleich',
    syncStatusModified: 'Ge\u00e4ndert',
    syncStatusLocalOnly: 'Neu (Lokal)',
    syncStatusServerOnly: 'Neu (Server)',
    syncStatusLocalNewer: 'Neuer (Lokal)',
    syncStatusServerNewer: 'Neuer (Server)',
    syncNoChanges: 'Alle Dateien sind synchron.',
    syncProgress: 'Synchronisiere',
    syncComplete: 'Synchronisation abgeschlossen!',
    syncFailed: 'Synchronisation fehlgeschlagen',
    syncComparing: 'Vergleiche Dateien...',
    syncNotSupported: 'Ihr Browser unterst\u00fctzt die File System Access API nicht. Verwenden Sie Chrome oder Edge.',
    syncFilterChanged: 'Nur \u00c4nderungen',
    syncRefresh: 'Aktualisieren',
    // Editor
    editorSave: 'Speichern',
    editorSaving: 'Speichere...',
    editorSaved: 'Gespeichert',
    editorSaveFailed: 'Speichern fehlgeschlagen',
    editorClose: 'Schlie\u00dfen',
    editorFileTooLarge: 'Datei zu gro\u00df f\u00fcr Editor (max. 2 MB).',
    editorUnsavedChanges: 'Ungespeicherte \u00c4nderungen. Verwerfen?',
    editorReadOnly: 'Nur Lesen (Zugriff auf Lesen & Schreiben setzen zum Bearbeiten)',
    editorSelectFile: 'W\u00e4hlen Sie eine Datei aus dem Dateien-Tab zum Bearbeiten.',
  },
};

let currentLang = localStorage.getItem('s3monitor-lang') || 'en';
let currentTab = 'dashboard';
let dashboardDataLoaded = false;
let s3DataLoaded = false;
let whmDataLoaded = false;
let updatesDataLoaded = false;
let allSitesDataLoaded = false;
let settingsDataLoaded = false;
let allSitesData = []; // cached for filtering
let currentDetailServerId = null;
let currentDetailTab = 'accounts';
let currentReleaseFilter = 'all';

// SSH state
let _sshTerminal = null;
let _sshWebSocket = null;
let _sshFitAddon = null;
let _sshConnected = false;
let _sftpCurrentPath = '/';
let _sftpSelected = new Set();
let _sftpSortField = 'name';
let _sftpSortDir = 'asc';
let _sftpShowHidden = localStorage.getItem('sftp-show-hidden') === 'true';
let _sftpSearchQuery = '';
let _sftpEntries = [];
let _sftpCanWrite = false;
// Sync state
let _syncActive = false;
let _syncLocalDirHandle = null;
let _syncLocalPath = '';
let _syncLocalEntries = [];
let _syncServerEntries = [];
let _syncLocalCurrentPath = '';
let _syncServerCurrentPath = '';
let _syncComparisonResults = [];
let _syncInProgress = false;
let _syncFilterChangedOnly = false;
let _cmEditor = null;
let _editorFilePath = null;
let _editorDirty = false;
let _editorOrigContent = '';

// ── i18n ──
function t(key) {
  return i18n[currentLang]?.[key] || i18n.en[key] || key;
}

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  const search = document.getElementById('accountSearch');
  if (search) search.placeholder = t('searchPlaceholder');
  const releaseSearch = document.getElementById('releaseSearch');
  if (releaseSearch) releaseSearch.placeholder = t('searchReleases');
  document.getElementById('langBtn').textContent =
    currentLang === 'en' ? 'DE' : 'EN';
}

function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'de' : 'en';
  localStorage.setItem('s3monitor-lang', currentLang);
  applyLanguage();
  if (window._lastS3Data) renderS3Buckets(window._lastS3Data);
  if (window._lastWhmData) renderServerOverview(window._lastWhmData);
  if (window._lastUpdatesData) renderReleases(window._lastUpdatesData);
  if (allSitesData.length > 0) renderAllSitesList(allSitesData);
}

// ── Theme Toggle ──
let currentTheme = localStorage.getItem('s3monitor-theme') || 'dark';

function applyTheme() {
  document.body.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML = currentTheme === 'dark'
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
      : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  }
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('s3monitor-theme', currentTheme);
  applyTheme();
}

// ── Formatting ──
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return val.toFixed(i > 0 ? 2 : 0) + ' ' + sizes[i];
}

function formatBytesChange(bytes) {
  if (bytes === 0) return t('noChange');
  const sign = bytes > 0 ? '+' : '';
  return sign + formatBytes(Math.abs(bytes));
}

function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}

function formatDate(dateStr) {
  if (!dateStr) return t('never');
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return currentLang === 'de' ? 'Gerade eben' : 'Just now';
  if (diffMins < 60) return currentLang === 'de' ? `Vor ${diffMins} Min.` : `${diffMins}m ago`;
  if (diffHours < 24) return currentLang === 'de' ? `Vor ${diffHours} Std.` : `${diffHours}h ago`;
  if (diffDays < 7) return currentLang === 'de' ? `Vor ${diffDays} Tagen` : `${diffDays}d ago`;
  return date.toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Tab Switching ──
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.tab').forEach((el) => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');

  // Stop pulse monitor when leaving dashboard
  if (tab !== 'dashboard' && pulseInterval) {
    clearInterval(pulseInterval);
    pulseInterval = null;
  }

  if (tab === 'dashboard' && !dashboardDataLoaded) {
    loadDashboard();
    dashboardDataLoaded = true;
  }
  if (tab === 's3' && !s3DataLoaded) {
    loadData();
    s3DataLoaded = true;
  }
  if (tab === 'whm' && !whmDataLoaded) {
    loadWhmData();
    whmDataLoaded = true;
  }
  if (tab === 'updates' && !updatesDataLoaded) {
    loadUpdatesData();
    updatesDataLoaded = true;
  }
  if (tab === 'allsites' && !allSitesDataLoaded) {
    loadAllSites();
    allSitesDataLoaded = true;
  }
  if (tab === 'settings' && !settingsDataLoaded) {
    loadSettings();
    settingsDataLoaded = true;
  }
}

// ══════════════════════════════════════════════
// S3 TAB
// ══════════════════════════════════════════════

function renderSparkline(history) {
  if (!history || history.length < 2) return '';
  const values = history.map((h) => h.size);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 160, h = 40, p = 2;
  const points = values.map((v, i) => {
    const x = p + (i / (values.length - 1)) * (w - p * 2);
    const y = h - p - ((v - min) / range) * (h - p * 2);
    return `${x},${y}`;
  }).join(' ');
  const firstX = p;
  const lastX = p + (w - p * 2);
  const fillPoints = `${firstX},${h - p} ${points} ${lastX},${h - p}`;
  return `<svg class="sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polygon points="${fillPoints}" fill="rgba(255,153,0,0.15)"/>
    <polyline points="${points}" fill="none" stroke="#ff9900" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

function renderS3Buckets(data) {
  window._lastS3Data = data;
  const grid = document.getElementById('bucketGrid');
  const loading = document.getElementById('loading');
  const error = document.getElementById('error');
  loading.classList.add('hidden');
  error.classList.add('hidden');

  document.getElementById('totalBuckets').textContent = data.totalBuckets;
  document.getElementById('totalSize').textContent = formatBytes(data.grandTotalSize);
  document.getElementById('totalObjects').textContent = formatNumber(data.grandTotalObjects);
  document.getElementById('lastFetch').textContent = formatDate(data.fetchedAt);

  if (!data.buckets || data.buckets.length === 0) {
    grid.innerHTML = `<div class="loading"><p>${t('noData')}</p></div>`;
    return;
  }

  const maxSize = Math.max(...data.buckets.map((b) => b.totalSize), 1);
  grid.innerHTML = data.buckets
    .sort((a, b) => b.totalSize - a.totalSize)
    .map((bucket) => {
      const sizePercent = (bucket.totalSize / maxSize) * 100;
      let alertClass = '';
      if (bucket.totalSize > 50 * 1024 ** 3) alertClass = 'alert-danger';
      else if (bucket.totalSize > 10 * 1024 ** 3) alertClass = 'alert-warning';
      const changeClass = bucket.sizeChange > 0 ? 'change-up' : bucket.sizeChange < 0 ? 'change-down' : 'change-none';
      const changeIcon = bucket.sizeChange > 0 ? '&#9650;' : bucket.sizeChange < 0 ? '&#9660;' : '&#9644;';
      return `
        <div class="bucket-card ${alertClass}">
          <div class="bucket-header">
            <span class="bucket-name">${escapeHtml(bucket.name)}</span>
            <span class="bucket-region">${escapeHtml(bucket.region)}</span>
          </div>
          <div class="bucket-stats">
            <div class="stat"><span class="stat-label">${t('size')}</span><span class="stat-value size">${bucket.totalSize === 0 ? t('empty') : formatBytes(bucket.totalSize)}</span></div>
            <div class="stat"><span class="stat-label">${t('objects')}</span><span class="stat-value">${formatNumber(bucket.totalObjects)}</span></div>
            <div class="stat"><span class="stat-label">${t('change24h')}</span><span class="stat-value ${changeClass}">${changeIcon} ${formatBytesChange(bucket.sizeChange)}</span></div>
            <div class="stat"><span class="stat-label">${t('lastActivity')}</span><span class="stat-value">${formatDate(bucket.lastActivity)}</span></div>
          </div>
          <div class="bucket-chart"><span class="chart-label">${t('last7days')}</span>${renderSparkline(bucket.history)}</div>
          <div class="size-bar"><div class="size-bar-fill" style="width:${sizePercent}%"></div></div>
          <div class="bucket-footer">
            <span>${t('created')}: ${formatDateShort(bucket.creationDate)}</span>
            <span>${t('metricsAsOf')}: ${formatDateShort(bucket.metricsTimestamp)}</span>
          </div>
        </div>`;
    }).join('');
}

async function loadData() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('bucketGrid').innerHTML = '';
  try {
    const res = await fetch('/api/summary');
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
    renderS3Buckets(await res.json());
  } catch (err) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('errorMsg').textContent = t('errorPrefix') + err.message;
  }
}

// ══════════════════════════════════════════════
// WHM TAB
// ══════════════════════════════════════════════

function getDiskAlertClass(pct) {
  if (pct >= 90) return 'disk-danger';
  if (pct >= 75) return 'disk-warn';
  return '';
}

function getLoadClass(load) {
  const v = parseFloat(load);
  if (v >= 4) return 'load-high';
  if (v >= 2) return 'load-medium';
  return 'load-normal';
}

function renderServerOverview(data) {
  window._lastWhmData = data;
  const grid = document.getElementById('serverGrid');
  const loading = document.getElementById('whmLoading');
  const error = document.getElementById('whmError');
  loading.classList.add('hidden');
  error.classList.add('hidden');

  document.getElementById('whmTotalServers').textContent = data.totalServers;
  document.getElementById('whmOnlineServers').textContent = data.onlineServers;
  document.getElementById('whmTotalAccounts').textContent = formatNumber(data.totalAccounts);

  const badge = document.getElementById('serverBadge');
  badge.textContent = data.totalServers;
  badge.classList.remove('hidden');

  if (!data.servers || data.servers.length === 0) {
    grid.innerHTML = `<div class="loading"><p>No servers configured.</p></div>`;
    return;
  }

  grid.innerHTML = data.servers.map((s) => {
    if (!s.online) {
      const typeBadge = s.type === 'ssh' ? '<span class="settings-type-badge type-ssh">SSH</span>' : '';
      const sshBadge = s.hasSSH && s.type !== 'ssh' ? '<span class="settings-type-badge type-ssh ssh-mini-badge">SSH</span>' : '';
      return `
        <div class="server-card server-offline" onclick="openServerDetail(${s.id})">
          <div class="server-header">
            <div><span class="status-dot offline"></span><span class="server-name">${escapeHtml(s.name)}</span></div>
            ${typeBadge}${sshBadge}
          </div>
          <div class="server-host">${escapeHtml(s.host)}</div>
          <div class="server-error-msg">${escapeHtml(s.error || t('serverOffline'))}</div>
        </div>`;
    }

    // SSH server card (simplified)
    if (s.type === 'ssh') {
      const alBadge = s.accessLevel === 'readwrite'
        ? '<span class="access-badge readwrite">R/W</span>'
        : '<span class="access-badge readonly">RO</span>';
      return `
        <div class="server-card" onclick="openServerDetail(${s.id})">
          <div class="server-header">
            <div><span class="status-dot online"></span><span class="server-name">${escapeHtml(s.name)}</span></div>
            <span class="settings-type-badge type-ssh">SSH</span>
          </div>
          <div class="server-host">${escapeHtml(s.host)}</div>
          <div class="server-indicators">${alBadge}</div>
        </div>`;
    }

    const criticalNames = ['httpd', 'mysqld', 'exim', 'named', 'sshd', 'ftpd', 'imap'];
    const criticalServices = s.services.filter((svc) => criticalNames.some((n) => svc.name.includes(n)));
    const hasDownService = criticalServices.some((svc) => !svc.running);

    return `
      <div class="server-card ${hasDownService ? 'alert-warning' : ''}" onclick="openServerDetail(${s.id})">
        <div class="server-header">
          <div><span class="status-dot online"></span><span class="server-name">${escapeHtml(s.name)}</span></div>
          <div class="server-header-badges">${s.hasSSH ? '<span class="settings-type-badge type-ssh ssh-mini-badge">SSH</span>' : ''}<a href="${escapeHtml(s.whmUrl)}" target="_blank" rel="noopener" class="whm-link" onclick="event.stopPropagation()">WHM</a></div>
        </div>
        <div class="server-host">${escapeHtml(s.hostname)}</div>
        <div class="server-version">cPanel ${escapeHtml(s.version)}</div>
        <div class="server-stats-grid">
          <div class="stat"><span class="stat-label">${t('accounts')}</span><span class="stat-value">${s.accounts}${s.suspendedAccounts > 0 ? ` <small class="text-warn">(${s.suspendedAccounts} susp.)</small>` : ''}</span></div>
          <div class="stat"><span class="stat-label">${t('load')}</span><span class="stat-value ${getLoadClass(s.load.one)}">${s.load.one} / ${s.load.five} / ${s.load.fifteen}</span></div>
        </div>
        ${s.disk && s.disk.length > 0 ? `
          <div class="server-disk">
            ${s.disk[0].totalMB ? `
              <div class="disk-entry">
                <span class="disk-label">${t('diskUsed')}</span>
                <span class="disk-value-text">${formatBytes(s.totalDiskUsedMB * 1024 * 1024)}</span>
              </div>
            ` : s.disk.slice(0, 3).map((d) => `
              <div class="disk-entry">
                <span class="disk-label">${escapeHtml(d.partition)}</span>
                <div class="disk-bar"><div class="disk-bar-fill ${getDiskAlertClass(d.percentage)}" style="width:${d.percentage}%"></div></div>
                <span class="disk-pct">${d.percentage}%</span>
              </div>`).join('')}
          </div>` : ''}
        <div class="server-services">
          ${criticalServices.map((svc) => `
            <span class="service-badge ${svc.running ? 'service-up' : 'service-down'}">${escapeHtml(svc.name)}</span>
          `).join('')}
        </div>
        <div class="server-indicators">
          <span class="indicator-badge" style="background:${getHealthColor(computeHealthScore(s))}20;color:${getHealthColor(computeHealthScore(s))};font-weight:700" title="${t('healthScore')}">${computeHealthScore(s)}% ${t('healthScore')}</span>
          ${s.sslWarnings > 0 ? `<span class="indicator-badge indicator-ssl-warn" title="${t('sslWarnings')}">&#128274; ${s.sslWarnings} ${t('sslWarnings')}</span>` : s.sslTotal > 0 ? `<span class="indicator-badge indicator-ssl-ok" title="${t('ssl')}">&#128274; ${t('sslOk')}</span>` : ''}
          ${typeof s.emailQueueSize === 'number' ? `<span class="indicator-badge ${s.emailQueueSize > 100 ? 'indicator-email-danger' : s.emailQueueSize > 20 ? 'indicator-email-warn' : 'indicator-email-ok'}" title="${t('emailQueue')}">&#9993; ${s.emailQueueSize}</span>` : ''}
          ${s.backupAvailable ? `<span class="indicator-badge ${s.backupFailed > 0 ? 'indicator-backup-fail' : 'indicator-backup-ok'}" title="${t('backups')}">${s.backupFailed > 0 ? '&#9888; ' + s.backupFailed + ' ' + t('backupFailed') : '&#9745; ' + s.backupJobs + ' ' + t('backups')}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

async function loadWhmData() {
  document.getElementById('whmLoading').classList.remove('hidden');
  document.getElementById('serverGrid').innerHTML = '';
  document.getElementById('whmError').classList.add('hidden');
  document.getElementById('serverDetail').classList.add('hidden');

  try {
    const res = await fetch('/api/whm/servers/overview');
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
    const whmData = await res.json();
    renderServerOverview(whmData);
    updateAlerts(whmData);
  } catch (err) {
    document.getElementById('whmLoading').classList.add('hidden');
    document.getElementById('whmError').classList.remove('hidden');
    document.getElementById('whmErrorMsg').textContent = t('errorPrefix') + err.message;
  }
}

// ── Server Detail ──
async function openServerDetail(serverId) {
  currentDetailServerId = serverId;

  document.getElementById('serverGrid').classList.add('hidden');
  document.getElementById('whmSummary').classList.add('hidden');
  document.getElementById('searchResults').classList.add('hidden');
  const detail = document.getElementById('serverDetail');
  detail.classList.remove('hidden');

  const serverData = window._lastWhmData?.servers?.find((s) => s.id === serverId);
  document.getElementById('detailServerName').textContent = serverData?.name || `Server ${serverId}`;

  const whmLink = document.getElementById('detailWhmLink');

  if (serverData?.type === 'ssh') {
    // Dedicated SSH server — only SSH tabs
    whmLink.classList.add('hidden');
    renderSSHDetailTabs();
    currentDetailTab = 'terminal';
    loadDetailTab('terminal');
  } else {
    // cPanel or other type — native tabs + optional SSH tabs
    whmLink.classList.remove('hidden');
    whmLink.href = serverData?.whmUrl || '#';
    renderCpanelDetailTabs(serverData?.hasSSH);
    currentDetailTab = 'accounts';
    loadDetailTab('accounts');
  }
}

function closeServerDetail() {
  // Clean up SSH resources
  if (_sshWebSocket) { _sshWebSocket.close(); _sshWebSocket = null; }
  if (_sshTerminal) { _sshTerminal.dispose(); _sshTerminal = null; }
  _sshConnected = false;
  _cmEditor = null;
  _editorFilePath = null;
  _editorDirty = false;

  document.getElementById('serverDetail').classList.add('hidden');
  document.getElementById('serverGrid').classList.remove('hidden');
  document.getElementById('whmSummary').classList.remove('hidden');
  currentDetailServerId = null;
}

function switchDetailTab(tab) {
  currentDetailTab = tab;
  document.querySelectorAll('.detail-tab').forEach((t) => t.classList.remove('active'));
  document.querySelector(`.detail-tab[data-dtab="${tab}"]`).classList.add('active');
  loadDetailTab(tab);
}

async function loadDetailTab(tab) {
  const content = document.getElementById('detailContent');

  // Clean up editor if leaving FTP tab
  if (currentDetailTab === 'ftp' && tab !== 'ftp') {
    if (_editorDirty && !confirm(t('editorUnsavedChanges'))) {
      document.querySelectorAll('.detail-tab').forEach((b) => b.classList.remove('active'));
      document.querySelector('.detail-tab[data-dtab="ftp"]')?.classList.add('active');
      currentDetailTab = 'ftp';
      return;
    }
    if (_cmEditor) { _cmEditor.toTextArea(); _cmEditor = null; }
    _editorFilePath = null;
    _editorDirty = false;
    _editorOrigContent = '';
  }

  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    if (tab === 'accounts') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/accounts`);
      const data = await res.json();
      renderAccountsTable(data.accounts || []);
    } else if (tab === 'services') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/services`);
      const data = await res.json();
      renderServicesTable(data.services || []);
    } else if (tab === 'logs') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/logs`);
      const data = await res.json();
      renderLogViewer(data);
    } else if (tab === 'backups') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/backups`);
      const data = await res.json();
      renderBackupsPanel(data);
    } else if (tab === 'ssl') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/ssl`);
      const data = await res.json();
      renderSslTable(data);
    } else if (tab === 'email') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/email`);
      const data = await res.json();
      renderEmailQueue(data);
    } else if (tab === 'php') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/php`);
      const data = await res.json();
      renderPhpPanel(data);
    } else if (tab === 'mysql') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/mysql`);
      const data = await res.json();
      renderMysqlPanel(data);
    } else if (tab === 'dns') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/dns`);
      const data = await res.json();
      renderDnsPanel(data);
    } else if (tab === 'bandwidth') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/bandwidth`);
      const data = await res.json();
      renderBandwidthPanel(data);
    } else if (tab === 'cron') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/cron`);
      const data = await res.json();
      renderCronPanel(data);
    } else if (tab === 'ports') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/ports`);
      const data = await res.json();
      renderPortsPanel(data);
    } else if (tab === 'blacklist') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/blacklist`);
      const data = await res.json();
      renderBlacklistPanel(data);
    } else if (tab === 'security') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/security`);
      const data = await res.json();
      renderSecurityPanel(data);
    } else if (tab === 'emailauth') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/emailauth`);
      const data = await res.json();
      renderEmailAuthPanel(data);
    } else if (tab === 'packages') {
      const res = await fetch(`/api/whm/server/${currentDetailServerId}/packages`);
      const data = await res.json();
      renderPackagesPanel(data);
    } else if (tab === 'terminal') {
      renderTerminalPanel();
      return; // no async fetch
    } else if (tab === 'ftp') {
      renderFTPPanel();
      return;
    }
  } catch (err) {
    content.innerHTML = `<div class="error"><p>${t('errorPrefix')}${err.message}</p></div>`;
  }
}

function renderAccountsTable(accounts) {
  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <div class="detail-toolbar">
      <input type="text" class="search-input detail-filter" placeholder="${t('filterAccounts')}" oninput="filterAccountsTable(this.value)">
      <span class="detail-count">${accounts.length} ${t('accounts')}</span>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table" id="accountsTable">
        <thead>
          <tr>
            <th>${t('domain')}</th>
            <th>${t('user')}</th>
            <th>${t('diskUsed')}</th>
            <th>${t('diskLimit')}</th>
            <th>${t('plan')}</th>
            <th>${t('ip')}</th>
            <th>${t('status')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map((a) => {
    const serverData = window._lastWhmData?.servers?.find((s) => s.id === currentDetailServerId);
    const whmUrl = serverData?.whmUrl || `https://${a.ip}:2087`;
    return `
            <tr class="account-row ${a.suspended ? 'row-suspended' : ''}">
              <td><strong>${escapeHtml(a.domain)}</strong></td>
              <td>${escapeHtml(a.user)}</td>
              <td>${escapeHtml(a.diskused)}</td>
              <td>${escapeHtml(a.disklimit)}</td>
              <td>${escapeHtml(a.plan)}</td>
              <td>${escapeHtml(a.ip)}</td>
              <td><span class="status-badge ${a.suspended ? 'badge-suspended' : 'badge-active'}">${a.suspended ? t('suspended') : t('active')}</span></td>
              <td><a href="${whmUrl}" target="_blank" rel="noopener" class="btn-cpanel" onclick="event.stopPropagation()">WHM</a></td>
            </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>`;
}

function filterAccountsTable(query) {
  const rows = document.querySelectorAll('#accountsTable .account-row');
  const q = query.toLowerCase();
  rows.forEach((row) => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function renderServicesTable(services) {
  const content = document.getElementById('detailContent');
  const running = services.filter((s) => s.running).length;
  const stopped = services.filter((s) => !s.running && s.enabled).length;

  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">
        <span class="text-success">${running} ${t('running')}</span>
        ${stopped > 0 ? `<span class="text-danger">${stopped} ${t('stopped')}</span>` : ''}
      </span>
    </div>
    <div class="services-grid">
      ${services.map((s) => `
        <div class="service-card ${s.running ? 'service-card-up' : s.enabled ? 'service-card-down' : 'service-card-disabled'}">
          <span class="service-status-dot ${s.running ? 'online' : 'offline'}"></span>
          <div class="service-info">
            <span class="service-name">${escapeHtml(s.displayName || s.name)}</span>
            <span class="service-state">${s.running ? t('running') : t('stopped')}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
}

function renderLogViewer(data) {
  const content = document.getElementById('detailContent');

  // New format: per-account error logs
  if (data.logs && data.logs.length > 0) {
    content.innerHTML = `
      <div class="detail-toolbar">
        <span class="detail-count">${data.totalErrors} errors &middot; ${data.logs.length} ${t('accounts')}</span>
        <button class="btn btn-refresh btn-sm" onclick="loadDetailTab('logs')">${t('refresh')}</button>
      </div>
      ${data.logs.map((log) => `
        <div class="log-viewer" style="margin-bottom:12px">
          <div class="log-toolbar">
            <span class="log-title">${escapeHtml(log.domain)} (${escapeHtml(log.user)})</span>
            <span class="detail-count">${log.errors.length} errors</span>
          </div>
          <pre class="log-content">${escapeHtml(log.errors.map((e) => typeof e === 'string' ? e : (e.message || e.msg || JSON.stringify(e))).join('\n'))}</pre>
        </div>
      `).join('')}`;
    return;
  }

  // Legacy format or empty
  if (data.error || (!data.logs || data.logs.length === 0) && (!data.lines || data.lines.length === 0)) {
    content.innerHTML = `
      <div class="log-fallback">
        <p>${t('logNotAvailable')}</p>
        ${data.whmLogUrl ? `<a href="${escapeHtml(data.whmLogUrl)}" target="_blank" class="btn btn-refresh">${t('openWhm')}</a>` : ''}
      </div>`;
    return;
  }

  content.innerHTML = `
    <div class="log-viewer">
      <div class="log-toolbar">
        <span class="log-title">${escapeHtml(data.type || 'Error Log')}</span>
        <button class="btn btn-refresh btn-sm" onclick="loadDetailTab('logs')">${t('refresh')}</button>
      </div>
      <pre class="log-content">${escapeHtml(data.lines.join('\n'))}</pre>
    </div>`;
}

// ── Backups Panel ──
function renderBackupsPanel(data) {
  const content = document.getElementById('detailContent');

  if (!data.available) {
    content.innerHTML = `<div class="log-fallback"><p>${t('backupNotInstalled')}</p></div>`;
    return;
  }

  if (!data.jobs || data.jobs.length === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('backupNoJobs')}</p></div>`;
    return;
  }

  // Jobs table
  const jobsHtml = `
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead><tr>
          <th>${t('backupJob')}</th>
          <th>${t('backupDestination')}</th>
          <th>${t('backupLastRun')}</th>
          <th>${t('backupNextRun')}</th>
          <th>${t('status')}</th>
        </tr></thead>
        <tbody>${data.jobs.map((j) => {
    let stClass = 'badge-active', stLabel = t('backupSuccess');
    if (j.running) { stClass = 'badge-running'; stLabel = t('backupRunning'); }
    else if (j.disabled) { stClass = 'badge-suspended'; stLabel = t('backupDisabled'); }
    return `<tr>
            <td><strong>${escapeHtml(j.name)}</strong></td>
            <td>${escapeHtml(j.destination)}</td>
            <td>${j.lastRun ? formatDate(j.lastRun) : '--'}</td>
            <td>${j.nextRun ? formatDate(j.nextRun) : '--'}</td>
            <td><span class="status-badge ${stClass}">${stLabel}</span></td>
          </tr>`;
  }).join('')}</tbody>
      </table>
    </div>`;

  // Destinations
  let destHtml = '';
  if (data.destinations && data.destinations.length > 0) {
    destHtml = `
      <div class="security-section" style="margin-top:24px">
        <h3 class="security-section-title">${t('backupDestinations')}</h3>
        <div class="backup-dest-grid">
          ${data.destinations.map((d) => {
      const usedPct = d.diskTotal > 0 ? Math.round((d.diskUsage / d.diskTotal) * 100) : 0;
      return `<div class="backup-dest-card">
              <div class="backup-dest-header">
                <strong>${escapeHtml(d.name)}</strong>
                <span class="status-badge badge-active">${escapeHtml(d.type)}</span>
              </div>
              <div class="backup-dest-disk">
                <div class="disk-bar"><div class="disk-bar-fill ${usedPct > 90 ? 'disk-danger' : usedPct > 75 ? 'disk-warn' : ''}" style="width:${usedPct}%"></div></div>
                <span class="backup-dest-disk-label">${formatBytes(d.diskUsage)} / ${formatBytes(d.diskTotal)} (${usedPct}%)</span>
              </div>
            </div>`;
    }).join('')}
        </div>
      </div>`;
  }

  // Schedules
  let schedHtml = '';
  if (data.schedules && data.schedules.length > 0) {
    schedHtml = `
      <div class="security-section" style="margin-top:24px">
        <h3 class="security-section-title">${t('backupSchedules')}</h3>
        <div class="table-wrapper">
          <table class="accounts-table">
            <thead><tr><th>${t('backupJobName')}</th><th>${t('backupFrequency')}</th><th>${t('backupJobName')}</th></tr></thead>
            <tbody>${data.schedules.map((s) => `<tr>
              <td><strong>${escapeHtml(s.name)}</strong></td>
              <td><span class="status-badge badge-active">${escapeHtml(s.typeName)}</span></td>
              <td>${escapeHtml(s.jobs)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  // Recent Logs
  let logsHtml = '';
  if (data.logs && data.logs.length > 0) {
    logsHtml = `
      <div class="security-section" style="margin-top:24px">
        <h3 class="security-section-title">${t('backupRecentLogs')}</h3>
        <div class="table-wrapper">
          <table class="accounts-table">
            <thead><tr><th>${t('backupJobName')}</th><th>${t('backupStatus')}</th><th>${t('backupDuration')}</th><th>${t('date')}</th></tr></thead>
            <tbody>${data.logs.map((l) => {
      const jobName = l.info?.Backup || l.info?.Type || '?';
      let stClass = 'badge-active', stLabel = t('backupSuccess');
      if (l.status === 4) { stClass = 'badge-warning'; stLabel = t('backupWarning'); }
      else if (l.status !== 1) { stClass = 'badge-suspended'; stLabel = t('backupFailed'); }
      const dur = l.executionTime > 60 ? Math.round(l.executionTime / 60) + 'm' : l.executionTime + 's';
      return `<tr>
                <td><strong>${escapeHtml(jobName)}</strong></td>
                <td><span class="status-badge ${stClass}">${stLabel}</span></td>
                <td>${dur}</td>
                <td>${l.startTime ? formatDate(l.startTime) : '--'}</td>
              </tr>`;
    }).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">${data.totalJobs} ${t('backups')}</span>
    </div>
    ${jobsHtml}${destHtml}${schedHtml}${logsHtml}`;
}

// ── SSL Table ──
function renderSslTable(data) {
  const content = document.getElementById('detailContent');

  if (data.error && (!data.certificates || data.certificates.length === 0)) {
    content.innerHTML = `<div class="log-fallback"><p>${escapeHtml(data.error)}</p></div>`;
    return;
  }

  if (!data.certificates || data.certificates.length === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('sslNoCerts')}</p></div>`;
    return;
  }

  const sslStatusClass = (status) => {
    if (status === 'ok') return 'ssl-ok';
    if (status === 'warning') return 'ssl-warning';
    if (status === 'critical') return 'ssl-critical';
    if (status === 'expired') return 'ssl-expired';
    return '';
  };

  const sslStatusLabel = (status) => {
    if (status === 'ok') return t('sslOk');
    if (status === 'warning') return t('sslWarning');
    if (status === 'critical') return t('sslCritical');
    if (status === 'expired') return t('sslExpired');
    return status;
  };

  const sorted = [...data.certificates].sort((a, b) => {
    if (a.daysRemaining === null) return 1;
    if (b.daysRemaining === null) return -1;
    return a.daysRemaining - b.daysRemaining;
  });

  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">
        ${data.totalCerts} ${t('ssl')}
        ${data.warningCount > 0 ? `<span class="text-danger">${data.warningCount} ${t('sslWarnings')}</span>` : ''}
      </span>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead>
          <tr>
            <th>${t('sslDomain')}</th>
            <th>${t('sslIssuer')}</th>
            <th>${t('sslExpiry')}</th>
            <th>${t('sslDaysLeft')}</th>
            <th>${t('sslStatus')}</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((c) => `
            <tr class="${c.status === 'expired' ? 'row-suspended' : ''}">
              <td><strong>${escapeHtml(c.domain)}</strong></td>
              <td>${escapeHtml(c.issuer)}</td>
              <td>${c.expiry ? formatDateShort(c.expiry) : '--'}</td>
              <td><span class="ssl-days ${sslStatusClass(c.status)}">${c.daysRemaining !== null ? c.daysRemaining : '--'}</span></td>
              <td><span class="status-badge ${sslStatusClass(c.status)}">${sslStatusLabel(c.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Email Queue ──
function renderEmailQueue(data) {
  const content = document.getElementById('detailContent');

  if (data.error && (!data.messages || data.messages.length === 0)) {
    content.innerHTML = `<div class="log-fallback"><p>${t('emailNotAvailable')}</p></div>`;
    return;
  }

  if (data.queueSize === 0 && (!data.messages || data.messages.length === 0)) {
    content.innerHTML = `
      <div class="log-fallback">
        <div class="email-queue-indicator email-queue-ok">
          <span class="email-queue-count">0</span>
        </div>
        <p>${t('emailNoQueue')}</p>
      </div>`;
    return;
  }

  const queueAlertClass = data.queueSize > 100 ? 'email-queue-danger' : data.queueSize > 20 ? 'email-queue-warning' : 'email-queue-ok';

  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">
        <span class="email-queue-badge ${queueAlertClass}">${t('emailQueueSize')}: ${data.queueSize}</span>
      </span>
      <button class="btn btn-refresh btn-sm" onclick="loadDetailTab('email')">${t('refresh')}</button>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>${t('emailSender')}</th>
            <th>${t('emailRecipient')}</th>
            <th>${t('emailAge')}</th>
            <th>${t('size')}</th>
            <th>${t('status')}</th>
          </tr>
        </thead>
        <tbody>
          ${data.messages.map((m) => `
            <tr class="${m.frozen ? 'row-suspended' : ''}">
              <td><code>${escapeHtml(m.id)}</code></td>
              <td>${escapeHtml(m.sender || '--')}</td>
              <td>${escapeHtml(m.recipient || '--')}</td>
              <td>${escapeHtml(m.age || '--')}</td>
              <td>${escapeHtml(m.size || '--')}</td>
              <td>${m.frozen ? `<span class="status-badge badge-suspended">${t('emailFrozen')}</span>` : `<span class="status-badge badge-active">${t('active')}</span>`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── PHP Panel ──
function renderPhpPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && data.totalDomains === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('phpNotAvailable')}</p></div>`;
    return;
  }
  const counts = Object.entries(data.versionCounts).sort((a, b) => b[1] - a[1]);
  const phpColors = { 'ea-php56': '#8892bf', 'ea-php70': '#7b68ee', 'ea-php71': '#6a5acd', 'ea-php72': '#4169e1', 'ea-php73': '#1e90ff', 'ea-php74': '#00bfff', 'ea-php80': '#2ecc71', 'ea-php81': '#27ae60', 'ea-php82': '#1abc9c', 'ea-php83': '#16a085', 'ea-php84': '#0d9b6e' };
  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">${data.totalDomains} ${t('phpDomains')}</span>
    </div>
    ${counts.length > 0 ? `<div class="php-version-chart">${counts.map(([ver, count]) => {
    const pct = Math.round((count / data.totalDomains) * 100);
    const color = phpColors[ver] || '#ff9900';
    return `<div class="php-bar-row"><span class="php-bar-label">${escapeHtml(ver)}</span><div class="php-bar-track"><div class="php-bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="php-bar-count">${count} (${pct}%)</span></div>`;
  }).join('')}</div>` : ''}
    <div class="table-wrapper" style="margin-top:16px">
      <table class="accounts-table">
        <thead><tr><th>${t('domain')}</th><th>${t('phpVersion')}</th></tr></thead>
        <tbody>${data.domains.map((d) => `<tr><td><strong>${escapeHtml(d.domain)}</strong></td><td><span class="status-badge badge-active">${escapeHtml(d.phpVersion)}</span></td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

// ── MySQL Panel ──
function renderMysqlPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && data.totalDatabases === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('mysqlNotAvailable')}</p></div>`;
    return;
  }
  if (data.totalDatabases === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('mysqlNotAvailable')}</p></div>`;
    return;
  }
  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">${data.totalDatabases} ${t('mysqlDatabases')} &middot; ${data.totalUsers} ${t('mysqlUsers')}</span>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead><tr><th>${t('user')}</th><th>${t('domain')}</th><th>${t('mysqlDbName')}</th></tr></thead>
        <tbody>${data.users.flatMap((u) => u.databases.map((db, i) => `<tr><td>${i === 0 ? `<strong>${escapeHtml(u.user)}</strong>` : ''}</td><td>${i === 0 ? escapeHtml(u.domain) : ''}</td><td><code>${escapeHtml(db.name)}</code></td></tr>`)).join('')}</tbody>
      </table>
    </div>`;
}

// ── DNS Panel ──
function renderDnsPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && (!data.zones || data.zones.length === 0) && !data.records) {
    content.innerHTML = `<div class="log-fallback"><p>${t('dnsNotAvailable')}</p></div>`;
    return;
  }

  // Zone detail view (records for a specific domain)
  if (data.records) {
    const records = data.records.filter((r) => r.type);
    const types = [...new Set(records.map((r) => r.type))].sort();
    content.innerHTML = `
      <div class="detail-toolbar">
        <button class="btn btn-back btn-sm" onclick="loadDetailTab('dns')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          ${t('dnsBackToZones')}
        </button>
        <span class="detail-count">${escapeHtml(data.domain)} &middot; ${records.length} ${t('dnsRecords')}</span>
      </div>
      <div class="dns-type-filters">${types.map((tp) => `<button class="release-filter-btn" onclick="filterDnsRecords('${tp}')">${tp} <span class="filter-count">${records.filter((r) => r.type === tp).length}</span></button>`).join('')}</div>
      <div class="table-wrapper">
        <table class="accounts-table" id="dnsTable">
          <thead><tr><th>${t('dnsType')}</th><th>${t('dnsName')}</th><th>${t('dnsTTL')}</th><th>${t('dnsValue')}</th></tr></thead>
          <tbody>${records.map((r) => `<tr class="dns-row" data-type="${escapeHtml(r.type || '')}"><td><span class="status-badge badge-active">${escapeHtml(r.type || '')}</span></td><td>${escapeHtml(r.name || '')}</td><td>${r.ttl || ''}</td><td style="word-break:break-all;max-width:400px">${escapeHtml(r.address || r.cname || r.txtdata || r.exchange || r.nsdname || r.target || '')}</td></tr>`).join('')}</tbody>
        </table>
      </div>`;
    return;
  }

  // Zone list view
  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">${data.totalZones} ${t('dnsZones')}</span>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead><tr><th>${t('domain')}</th><th>${t('dnsType')}</th><th></th></tr></thead>
        <tbody>${data.zones.map((z) => `<tr style="cursor:pointer" onclick="loadDnsZone('${escapeHtml(z.domain)}')"><td><strong>${escapeHtml(z.domain)}</strong></td><td>${escapeHtml(z.type)}</td><td><span class="release-link">${t('dnsRecords')} &rarr;</span></td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

async function loadDnsZone(domain) {
  const content = document.getElementById('detailContent');
  content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`/api/whm/server/${currentDetailServerId}/dns?domain=${encodeURIComponent(domain)}`);
    const data = await res.json();
    renderDnsPanel(data);
  } catch (err) {
    content.innerHTML = `<div class="error"><p>${t('errorPrefix')}${err.message}</p></div>`;
  }
}

function filterDnsRecords(type) {
  document.querySelectorAll('#dnsTable .dns-row').forEach((row) => {
    row.style.display = row.getAttribute('data-type') === type || type === 'all' ? '' : 'none';
  });
}

// ── Bandwidth Panel ──
function renderBandwidthPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && data.totalAccounts === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('bwNotAvailable')}</p></div>`;
    return;
  }
  if (data.totalAccounts === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('bwNotAvailable')}</p></div>`;
    return;
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthLabel = data.month ? monthNames[data.month - 1] + ' ' + data.year : '';
  const maxBw = Math.max(...data.accounts.map((a) => a.bwUsed), 1);

  content.innerHTML = `
    <div class="detail-toolbar" style="flex-wrap:wrap;gap:12px;">
      <span class="detail-count">${data.totalAccounts} ${t('accounts')}</span>
      <div class="bw-server-summary">
        <span class="bw-summary-label">${t('bwServerTotal')} (${monthLabel}):</span>
        <span class="bw-summary-value">${formatBytes(data.totalUsed || 0)}</span>
      </div>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead><tr><th style="width:32px"></th><th>${t('user')}</th><th>${t('domain')}</th><th>${t('bwUsed')}</th><th>${t('bwLimit')}</th><th style="min-width:180px"></th></tr></thead>
        <tbody>${data.accounts.map((a, idx) => {
    const limitVal = a.bwLimit > 0 ? a.bwLimit : 0;
    const pctOfLimit = limitVal > 0 ? Math.min(100, Math.round((a.bwUsed / limitVal) * 100)) : 0;
    const pctOfMax = Math.round((a.bwUsed / maxBw) * 100);
    const pct = limitVal > 0 ? pctOfLimit : pctOfMax;
    const overLimit = limitVal > 0 && a.bwUsed > limitVal;
    const limitStr = limitVal > 0 ? formatBytes(limitVal) : t('bwUnlimited');
    const hasDomains = a.domains && a.domains.length > 1;
    const rowId = 'bwDetail' + idx;
    const domainMax = hasDomains ? Math.max(...a.domains.map((d) => d.usage), 1) : 1;

    let domainRows = '';
    if (hasDomains) {
      domainRows = '<tr class="bw-domain-rows hidden" id="' + rowId + '"><td colspan="6"><div class="bw-domain-list">' +
        a.domains.map((d) => {
          const dPct = Math.round((d.usage / domainMax) * 100);
          return '<div class="bw-domain-item"><span class="bw-domain-name">' + escapeHtml(d.domain) + '</span><div class="disk-bar"><div class="disk-bar-fill" style="width:' + dPct + '%"></div></div><span class="bw-domain-usage">' + formatBytes(d.usage) + '</span></div>';
        }).join('') +
        '</div></td></tr>';
    }

    return '<tr class="' + (overLimit ? 'row-suspended' : '') + '">' +
      '<td>' + (hasDomains ? '<button class="btn btn-sm bw-expand-btn" onclick="toggleBwDetail(\'' + rowId + '\',this)">+</button>' : '') + '</td>' +
      '<td><strong>' + escapeHtml(a.user) + '</strong></td>' +
      '<td>' + escapeHtml(a.domain) + '</td>' +
      '<td>' + formatBytes(a.bwUsed) + '</td>' +
      '<td>' + limitStr + '</td>' +
      '<td><div class="disk-bar"><div class="disk-bar-fill ' + (overLimit ? 'disk-danger' : pct > 75 ? 'disk-warn' : '') + '" style="width:' + pct + '%"></div></div>' +
      (limitVal > 0 ? '<small class="bw-pct-label">' + pctOfLimit + '%</small>' : '') + '</td>' +
      '</tr>' + domainRows;
  }).join('')}</tbody>
      </table>
    </div>`;
}

function toggleBwDetail(rowId, btn) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.classList.toggle('hidden');
  btn.textContent = row.classList.contains('hidden') ? '+' : '-';
}

// ── Cron Panel ──
function renderCronPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && data.totalCrons === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('cronNotAvailable')}</p></div>`;
    return;
  }
  if (data.totalCrons === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('cronNoJobs')}</p></div>`;
    return;
  }
  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">${data.totalCrons} ${t('cron')} &middot; ${data.totalUsers} ${t('accounts')}</span>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead><tr><th>${t('user')}</th><th>${t('cronSchedule')}</th><th>${t('cronCommand')}</th></tr></thead>
        <tbody>${data.users.flatMap((u) => u.crons.map((c, i) => `<tr><td>${i === 0 ? `<strong>${escapeHtml(u.user)}</strong><br><small>${escapeHtml(u.domain)}</small>` : ''}</td><td><code class="cron-schedule">${c.minute} ${c.hour} ${c.day} ${c.month} ${c.weekday}</code></td><td><code class="cron-command">${escapeHtml(c.command)}</code></td></tr>`)).join('')}</tbody>
      </table>
    </div>`;
}

// ── Ports Panel ──
const portCategoryLabels = {
  web: 'portsCatWeb',
  email: 'portsCatEmail',
  admin: 'portsCatAdmin',
  file: 'portsCatFile',
  dns: 'portsCatDns',
  cpanel: 'portsCatCpanel',
  database: 'portsCatDatabase',
};

const portCategoryColors = {
  web: '#2196f3',
  email: '#9c27b0',
  admin: '#ff5722',
  file: '#ff9800',
  dns: '#00bcd4',
  cpanel: '#ff9900',
  database: '#4caf50',
};

function renderPortsPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && !data.ports) {
    content.innerHTML = `<div class="log-fallback"><p>${t('portsNotAvailable')}</p></div>`;
    return;
  }

  const ports = data.ports || [];
  const openPorts = ports.filter((p) => p.open);
  const closedPorts = ports.filter((p) => !p.open);

  // Group by category
  const categories = {};
  ports.forEach((p) => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  });

  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">
        <span class="port-count-open">${openPorts.length} ${t('portsOpen')}</span>
        <span class="port-count-sep">/</span>
        <span class="port-count-closed">${closedPorts.length} ${t('portsClosed')}</span>
        <span class="port-count-sep">/</span>
        ${data.totalScanned} ${t('portsScanned')}
      </span>
    </div>
    <div class="ports-grid">
      ${ports.map((p) => {
    const catColor = portCategoryColors[p.category] || '#9e9e9e';
    const catLabel = t(portCategoryLabels[p.category] || 'portsCatWeb');
    return `<div class="port-card ${p.open ? 'port-open' : 'port-closed'}">
          <div class="port-number">${p.port}</div>
          <div class="port-info">
            <span class="port-name">${escapeHtml(p.name)}</span>
            <span class="port-cat-badge" style="background:${catColor}18;color:${catColor}">${catLabel}</span>
          </div>
          <div class="port-status-indicator">
            <span class="port-dot ${p.open ? 'port-dot-open' : 'port-dot-closed'}"></span>
            <span class="port-status-text ${p.open ? 'text-success' : 'text-muted'}">${p.open ? t('portsOpen') : t('portsClosed')}</span>
          </div>
        </div>`;
  }).join('')}
    </div>`;
}

// ── Blacklist Panel ──
function renderBlacklistPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && !data.checks) {
    content.innerHTML = `<div class="log-fallback"><p>${t('blacklistNotAvailable')}</p></div>`;
    return;
  }
  const checks = data.checks || [];
  const listed = checks.filter((c) => c.listed);

  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">
        ${t('blacklistIp')}: <strong>${escapeHtml(data.ip || '')}</strong>
        &middot;
        ${listed.length > 0
      ? `<span class="text-danger">${listed.length} ${t('blacklistListedOn')}</span>`
      : `<span class="text-success">${t('blacklistAllClear')}</span>`}
      </span>
    </div>
    <div class="blacklist-grid">
      ${checks.map((c) => `
        <div class="blacklist-card ${c.listed ? 'blacklist-listed' : 'blacklist-clean'}">
          <div class="blacklist-provider">${escapeHtml(c.provider)}</div>
          <div class="blacklist-host">${escapeHtml(c.host)}</div>
          <div class="blacklist-status-indicator">
            <span class="blacklist-dot ${c.listed ? 'blacklist-dot-listed' : 'blacklist-dot-clean'}"></span>
            <span class="${c.listed ? 'text-danger' : 'text-success'}">${c.listed ? t('blacklistListed') : t('blacklistClean')}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
}

// ── Security Panel ──
function renderSecurityPanel(data) {
  const content = document.getElementById('detailContent');

  const svcIcon = (icon, running) => {
    const color = running ? 'var(--success)' : 'var(--text-secondary)';
    const icons = {
      shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
      bug: `<path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 016 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z"/><path d="M6 13H2M22 13h-4M6 17H2M22 17h-4"/>`,
      mail: `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`,
      firewall: `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>`,
      terminal: `<polyline points="4,17 10,11 4,5"/><line x1="12" y1="19" x2="20" y2="19"/>`,
      folder: `<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>`,
      globe: `<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>`,
      server: `<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>`,
      database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
      code: `<polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/>`,
    };
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[icon] || icons.server}</svg>`;
  };

  // Services grid
  let servicesHtml = '';
  if (data.services && data.services.length > 0) {
    const summary = t('securitySummary').replace('{running}', data.runningCount || 0).replace('{stopped}', data.stoppedCount || 0);
    servicesHtml = `
      <div class="detail-toolbar"><span class="detail-count">${data.totalServices} services &middot; ${summary}</span></div>
      <div class="security-svc-grid">
        ${data.services.map((s) => `
          <div class="security-svc-card ${s.running ? 'svc-running' : s.enabled ? 'svc-stopped' : 'svc-disabled'}">
            <div class="security-svc-icon">${svcIcon(s.icon, s.running)}</div>
            <div class="security-svc-info">
              <div class="security-svc-name">${escapeHtml(s.label)}</div>
              <span class="status-badge ${s.running ? 'badge-active' : s.enabled ? 'badge-suspended' : 'badge-suspended'}">${s.running ? t('securityRunning') : s.enabled ? t('securityStopped') : t('securityDisabled')}</span>
            </div>
          </div>`).join('')}
      </div>`;
  } else {
    servicesHtml = `<p class="text-muted" style="padding:16px 0">${t('securityNoServices')}</p>`;
  }

  // 2FA section
  let tfaHtml = '';
  if (data.twoFactor?.available) {
    const enabled = data.twoFactor.enabled;
    tfaHtml = `
      <div class="security-tfa ${enabled ? 'tfa-enabled' : 'tfa-disabled'}">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${enabled ? 'var(--success)' : 'var(--warning, #f59e0b)'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          ${enabled ? '<polyline points="9,12 11,14 15,10"/>' : '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
        </svg>
        <div>
          <strong>${t('securityTwoFactor')}</strong>
          <p>${enabled ? t('securityTwoFactorEnabled') : t('securityTwoFactorDisabled')}</p>
        </div>
      </div>`;
  } else {
    tfaHtml = `
      <div class="security-tfa tfa-unknown">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <div>
          <strong>${t('securityTwoFactor')}</strong>
          <p>${t('securityTwoFactorUnavailable')}</p>
        </div>
      </div>`;
  }

  content.innerHTML = `
    <div class="security-section">
      <h3 class="security-section-title">${t('securityTwoFactor')}</h3>
      ${tfaHtml}
    </div>
    <div class="security-section" style="margin-top:24px">
      <h3 class="security-section-title">${t('securityServices')}</h3>
      ${servicesHtml}
    </div>`;
}

// ── Email Auth Panel ──
function renderEmailAuthPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && !data.domains) {
    content.innerHTML = `<div class="log-fallback"><p>${t('emailAuthNotAvailable')}</p></div>`;
    return;
  }
  const domains = data.domains || [];
  const statusBadge = (found) => found
    ? `<span class="status-badge badge-active">${t('emailAuthFound')}</span>`
    : `<span class="status-badge badge-suspended">${t('emailAuthMissing')}</span>`;

  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">
        ${data.totalDomains || 0} ${t('emailAuthDomain')}s
        &middot; SPF: ${data.spfCount || 0}/${data.totalDomains || 0}
        &middot; DKIM: ${data.dkimCount || 0}/${data.totalDomains || 0}
        &middot; DMARC: ${data.dmarcCount || 0}/${data.totalDomains || 0}
      </span>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead><tr>
          <th>${t('emailAuthDomain')}</th>
          <th>${t('user')}</th>
          <th>${t('emailAuthSpf')}</th>
          <th>${t('emailAuthDkim')}</th>
          <th>${t('emailAuthDmarc')}</th>
        </tr></thead>
        <tbody>
          ${domains.map((d) => `<tr>
            <td><strong>${escapeHtml(d.domain)}</strong></td>
            <td>${escapeHtml(d.user)}</td>
            <td>${statusBadge(d.spf.found)}</td>
            <td>${statusBadge(d.dkim.found)}</td>
            <td>${statusBadge(d.dmarc.found)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

// ── Packages Panel ──
function renderPackagesPanel(data) {
  const content = document.getElementById('detailContent');
  if (data.error && data.totalPackages === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('pkgNotAvailable')}</p></div>`;
    return;
  }
  if (!data.packages || data.packages.length === 0) {
    content.innerHTML = `<div class="log-fallback"><p>${t('pkgNone')}</p></div>`;
    return;
  }

  const fmtVal = (v) => v === 'unlimited' || v === '0' || v === 0 ? t('bwUnlimited') : v;
  const fmtQuota = (v) => v === 'unlimited' || v === '0' || v === 0 ? t('bwUnlimited') : v + ' MB';
  const yesNo = (v) => v
    ? `<span class="status-badge badge-active">${t('pkgYes')}</span>`
    : `<span class="status-badge badge-suspended">${t('pkgNo')}</span>`;

  content.innerHTML = `
    <div class="detail-toolbar">
      <span class="detail-count">${data.totalPackages} ${t('packages')}</span>
    </div>
    <div class="table-wrapper">
      <table class="accounts-table">
        <thead><tr>
          <th>${t('pkgName')}</th>
          <th>${t('pkgDiskQuota')}</th>
          <th>${t('bwLimit')}</th>
          <th>${t('pkgAddon')}</th>
          <th>${t('pkgEmail')}</th>
          <th>${t('pkgSql')}</th>
          <th>${t('pkgFtp')}</th>
          <th>${t('pkgShell')}</th>
        </tr></thead>
        <tbody>${data.packages.map((p) => `<tr>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td>${fmtQuota(p.quota)}</td>
          <td>${fmtQuota(p.bwLimit)}</td>
          <td>${fmtVal(p.maxAddon)}</td>
          <td>${fmtVal(p.maxPop)}</td>
          <td>${fmtVal(p.maxSql)}</td>
          <td>${fmtVal(p.maxFtp)}</td>
          <td>${yesNo(p.hasShell)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}

// ══════════════════════════════════════════════
// ALL SITES TAB
// ══════════════════════════════════════════════

let allSitesServerFilter = 'all';

async function loadAllSites() {
  const loading = document.getElementById('allSitesLoading');
  const list = document.getElementById('allSitesList');
  loading.classList.remove('hidden');
  list.innerHTML = '';

  try {
    const res = await fetch('/api/whm/accounts/all');
    const data = await res.json();
    allSitesData = data.accounts || [];

    document.getElementById('allSitesTotal').textContent = allSitesData.length;
    const serverNames = [...new Set(allSitesData.map((a) => a.serverName))];
    document.getElementById('allSitesServers').textContent = serverNames.length;

    // Build server filter buttons
    const filtersEl = document.getElementById('allSitesFilters');
    filtersEl.innerHTML = `
      <button class="allsites-filter-btn active" data-server="all" onclick="filterAllSites('all')">${t('allSitesFilterAll')} (${allSitesData.length})</button>
      ${serverNames.map((name) => {
      const count = allSitesData.filter((a) => a.serverName === name).length;
      return `<button class="allsites-filter-btn" data-server="${escapeHtml(name)}" onclick="filterAllSites('${escapeHtml(name).replace(/'/g, "\\'")}')">${escapeHtml(name)} (${count})</button>`;
    }).join('')}
    `;

    // Badge
    const badge = document.getElementById('allSitesBadge');
    if (badge) { badge.textContent = allSitesData.length; badge.classList.remove('hidden'); }

    renderAllSitesList(allSitesData);
  } catch (err) {
    list.innerHTML = `<p class="text-muted">${escapeHtml(err.message)}</p>`;
  } finally {
    loading.classList.add('hidden');
  }
}

function filterAllSites(serverName) {
  allSitesServerFilter = serverName;
  document.querySelectorAll('.allsites-filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.server === serverName);
  });
  applyAllSitesFilters();
}

function applyAllSitesFilters() {
  const query = (document.getElementById('allSitesSearch')?.value || '').toLowerCase().trim();
  let filtered = allSitesData;

  if (allSitesServerFilter !== 'all') {
    filtered = filtered.filter((a) => a.serverName === allSitesServerFilter);
  }
  if (query) {
    filtered = filtered.filter((a) =>
      a.domain.toLowerCase().includes(query) ||
      a.user.toLowerCase().includes(query) ||
      a.email.toLowerCase().includes(query) ||
      a.serverName.toLowerCase().includes(query)
    );
  }
  renderAllSitesList(filtered);
}

function renderAllSitesList(accounts) {
  const list = document.getElementById('allSitesList');
  if (accounts.length === 0) {
    list.innerHTML = `<p class="text-muted">${t('allSitesNoResults')}</p>`;
    return;
  }

  // Sort: active first, then alphabetically by domain
  const sorted = [...accounts].sort((a, b) => {
    if (a.suspended !== b.suspended) return a.suspended ? 1 : -1;
    return a.domain.localeCompare(b.domain);
  });

  list.innerHTML = `
    <div class="allsites-table">
      <div class="allsites-header">
        <span>${t('allSitesDomain')}</span>
        <span>${t('allSitesUser')}</span>
        <span>${t('allSitesDiskUsed')}</span>
        <span>${t('allSitesServer')}</span>
        <span>${t('allSitesStatus')}</span>
        <span></span>
      </div>
      ${sorted.map((a) => `
        <div class="allsites-row${a.suspended ? ' allsites-suspended' : ''}">
          <span class="allsites-domain">
            <a href="https://${escapeHtml(a.domain)}" target="_blank" rel="noopener">${escapeHtml(a.domain)}</a>
          </span>
          <span class="allsites-user">${escapeHtml(a.user)}</span>
          <span class="allsites-disk">${escapeHtml(a.diskused)}</span>
          <span class="allsites-server">
            <span class="allsites-server-badge">${escapeHtml(a.serverName)}</span>
          </span>
          <span class="allsites-status">
            <span class="status-dot ${a.suspended ? 'status-danger' : 'status-ok'}"></span>
            ${a.suspended ? t('allSitesSuspended') : t('allSitesActive')}
          </span>
          <span class="allsites-login">
            <button class="btn-cpanel-login" onclick="cpanelLogin(${a.serverId}, '${escapeHtml(a.user).replace(/'/g, "\\'")}', event)" title="Login to cPanel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              cPanel
            </button>
          </span>
        </div>
      `).join('')}
    </div>
  `;
}

async function cpanelLogin(serverId, user, ev) {
  const btn = ev ? ev.currentTarget : (event ? event.currentTarget : null);
  if (!btn) return;
  btn.classList.add('loading-btn');
  btn.textContent = '...';
  try {
    const res = await fetch(`/api/whm/server/${serverId}/login/${encodeURIComponent(user)}`);
    const data = await res.json();
    if (data.url) {
      window.open(data.url, '_blank');
    } else {
      alert(data.error || 'Login failed');
    }
  } catch (err) {
    alert('Login error: ' + err.message);
  } finally {
    btn.classList.remove('loading-btn');
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> cPanel`;
  }
}

// Search input listener (attached on DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('allSitesSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => applyAllSitesFilters());
  }
});

// DASHBOARD TAB
// ══════════════════════════════════════════════

async function loadDashboard() {
  const loading = document.getElementById('dashLoading');
  const content = document.getElementById('dashContent');
  loading.classList.remove('hidden');
  content.innerHTML = '';

  try {
    const [s3Res, whmRes, updatesRes, bwRes] = await Promise.allSettled([
      fetch('/api/summary').then((r) => r.json()),
      fetch('/api/whm/servers/overview').then((r) => r.json()),
      fetch('/api/cpanel/releases').then((r) => r.json()),
      fetch('/api/whm/servers/bandwidth').then((r) => r.json()),
    ]);

    const s3Data = s3Res.status === 'fulfilled' ? s3Res.value : null;
    const whmData = whmRes.status === 'fulfilled' ? whmRes.value : null;
    const updatesData = updatesRes.status === 'fulfilled' ? updatesRes.value : null;
    let bwData = bwRes.status === 'fulfilled' ? bwRes.value : null;
    if (!bwData) { try { bwData = JSON.parse(localStorage.getItem('dash_bw_cache')); } catch { } }

    // Cache for other tabs
    if (s3Data) window._lastS3Data = s3Data;
    if (whmData) { window._lastWhmData = whmData; updateAlerts(whmData); }
    if (updatesData) window._lastUpdatesData = updatesData;
    if (bwData) { try { localStorage.setItem('dash_bw_cache', JSON.stringify(bwData)); } catch { } }

    loading.classList.add('hidden');
    renderDashboard(s3Data, whmData, updatesData, bwData);
  } catch (err) {
    loading.classList.add('hidden');
    content.innerHTML = `<div class="error"><p>${t('errorPrefix')}${err.message}</p></div>`;
  }
}

function renderDashboard(s3Data, whmData, updatesData, bwData) {
  const content = document.getElementById('dashContent');
  const servers = whmData?.servers || [];
  const onlineServers = servers.filter((s) => s.online);
  const offlineServers = servers.filter((s) => !s.online);

  // Aggregate metrics
  const totalAccounts = servers.reduce((sum, s) => sum + (s.accounts || 0), 0);
  const totalSuspended = servers.reduce((sum, s) => sum + (s.suspendedAccounts || 0), 0);
  const totalSslCerts = onlineServers.reduce((sum, s) => sum + (s.sslTotal || 0), 0);
  const totalSslWarnings = onlineServers.reduce((sum, s) => sum + (s.sslWarnings || 0), 0);
  const totalEmailQueue = onlineServers.reduce((sum, s) => sum + (s.emailQueueSize || 0), 0);
  const totalBackupJobs = onlineServers.reduce((sum, s) => sum + (s.backupJobs || 0), 0);
  const totalBackupFailed = onlineServers.reduce((sum, s) => sum + (s.backupFailed || 0), 0);
  const avgHealth = onlineServers.length > 0 ? Math.round(onlineServers.reduce((sum, s) => sum + computeHealthScore(s), 0) / onlineServers.length) : 0;

  // Services aggregation
  let totalServicesUp = 0, totalServicesDown = 0;
  const criticalNames = ['httpd', 'mysqld', 'exim', 'named', 'sshd', 'ftpd'];
  onlineServers.forEach((s) => {
    (s.services || []).forEach((svc) => {
      if (criticalNames.some((n) => svc.name.includes(n))) {
        if (svc.running) totalServicesUp++;
        else totalServicesDown++;
      }
    });
  });

  // Alerts
  const alerts = whmData ? computeAlerts(whmData) : [];

  // S3 metrics
  const s3Buckets = s3Data?.totalBuckets || 0;
  const s3TotalSize = s3Data?.grandTotalSize || 0;
  const s3TotalObjects = s3Data?.grandTotalObjects || 0;

  content.innerHTML = `
    <!-- Top Summary Cards -->
    <div class="dash-summary">
      <div class="dash-card dash-card-accent" onclick="switchTab('whm')">
        <div class="dash-card-icon dash-icon-servers">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1"/><circle cx="6" cy="18" r="1"/></svg>
        </div>
        <div class="dash-card-data">
          <span class="dash-card-value">${servers.length}</span>
          <span class="dash-card-label">${t('dashServers')}</span>
          <span class="dash-card-sub">${onlineServers.length} ${t('dashOnline')}${offlineServers.length > 0 ? ` · <span class="text-danger">${offlineServers.length} ${t('dashOffline')}</span>` : ''}</span>
        </div>
      </div>
      <div class="dash-card" onclick="switchTab('whm')">
        <div class="dash-card-icon dash-icon-accounts">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="dash-card-data">
          <span class="dash-card-value">${formatNumber(totalAccounts)}</span>
          <span class="dash-card-label">${t('dashAccounts')}</span>
          <span class="dash-card-sub">${totalSuspended > 0 ? `<span class="text-warn">${totalSuspended} ${t('suspended')}</span>` : t('active')}</span>
        </div>
      </div>
      <div class="dash-card" onclick="switchTab('s3')">
        <div class="dash-card-icon dash-icon-s3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="dash-card-data">
          <span class="dash-card-value">${s3Buckets}</span>
          <span class="dash-card-label">${t('dashS3Buckets')}</span>
          <span class="dash-card-sub">${formatBytes(s3TotalSize)} · ${formatNumber(s3TotalObjects)} ${t('objects')}</span>
        </div>
      </div>
      <div class="dash-card">
        <div class="dash-card-icon dash-icon-health" style="background:${getHealthColor(avgHealth)}18;color:${getHealthColor(avgHealth)}">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <div class="dash-card-data">
          <span class="dash-card-value" style="color:${getHealthColor(avgHealth)}">${avgHealth}%</span>
          <span class="dash-card-label">${t('dashHealthAvg')}</span>
          <span class="dash-card-sub">${totalServicesDown > 0 ? `<span class="text-danger">${totalServicesDown} ${t('dashServicesDown')}</span>` : `${totalServicesUp} ${t('dashServicesUp')}`}</span>
        </div>
      </div>
    </div>

    <!-- Two-Column Layout -->
    <div class="dash-grid">
      <!-- Left Column -->
      <div class="dash-col">

        <!-- Server Health Cards -->
        <div class="dash-section">
          <h3 class="dash-section-title">${t('dashServerHealth')}</h3>
          <div class="dash-health-list">
            ${servers.map((s) => {
    if (!s.online) {
      return `<div class="dash-health-item dash-health-offline" onclick="switchTab('whm')">
                  <span class="status-dot offline"></span>
                  <span class="dash-health-name">${escapeHtml(s.name)}</span>
                  <span class="dash-health-status text-danger">${t('dashOffline')}</span>
                </div>`;
    }
    const score = computeHealthScore(s);
    const color = getHealthColor(score);
    return `<div class="dash-health-item" onclick="switchTab('whm')">
                <span class="status-dot online"></span>
                <span class="dash-health-name">${escapeHtml(s.name)}</span>
                <div class="dash-health-bar-track"><div class="dash-health-bar-fill" style="width:${score}%;background:${color}"></div></div>
                <span class="dash-health-score" style="color:${color}">${score}%</span>
                <div class="dash-health-details">
                  <span class="dash-mini-stat">${s.accounts || 0} ${t('accounts')}</span>
                  <span class="dash-mini-stat">${t('load')}: <span class="${getLoadClass(s.load?.one)}">${s.load?.one || '0'}</span></span>
                  ${s.sslWarnings > 0 ? `<span class="dash-mini-stat text-warn">${s.sslWarnings} SSL</span>` : ''}
                </div>
              </div>`;
  }).join('')}
          </div>
        </div>

        <!-- Disk Usage -->
        <div class="dash-section">
          <h3 class="dash-section-title">${t('dashDiskUsage')}</h3>
          <div class="dash-disk-list">
            ${onlineServers.map((s) => {
    const disks = s.disk || [];
    if (disks.length === 0) return '';

    // Check if we have real partition data (percentage > 0) or account-based data
    const hasRealPartitions = disks.some((d) => d.percentage > 0);

    if (hasRealPartitions) {
      // Show real partition bars
      return disks.filter((d) => d.percentage > 0).map((d) => {
        const pct = d.percentage;
        return `<div class="dash-disk-item">
                    <span class="dash-disk-name">${escapeHtml(s.name)} <small style="color:var(--text-secondary)">${escapeHtml(d.partition)}</small></span>
                    <div class="dash-disk-bar-track"><div class="disk-bar-fill ${getDiskAlertClass(pct)}" style="width:${pct}%"></div></div>
                    <span class="dash-disk-pct ${pct >= 90 ? 'text-danger' : pct >= 75 ? 'text-warn' : ''}">${pct}%</span>
                  </div>`;
      }).join('');
    }

    // Account-based: show total used size + remaining if diskTotalGB configured
    const totalMB = s.totalDiskUsedMB || disks[0]?.totalMB || 0;
    if (totalMB > 0) {
      const totalGB = s.diskTotalGB || 0;
      if (totalGB > 0) {
        const usedGB = totalMB / 1024;
        const remainGB = totalGB - usedGB;
        const pct = Math.min(100, Math.round((usedGB / totalGB) * 100));
        return `<div class="dash-disk-item" style="grid-template-columns:120px 1fr 45px">
                    <span class="dash-disk-name">${escapeHtml(s.name)}</span>
                    <div class="dash-disk-bar-track"><div class="disk-bar-fill ${getDiskAlertClass(pct)}" style="width:${pct}%"></div></div>
                    <span class="dash-disk-pct ${pct >= 90 ? 'text-danger' : pct >= 75 ? 'text-warn' : ''}">${pct}%</span>
                  </div>
                  <div class="dash-disk-detail">
                    <span>${t('diskUsed')}: <strong>${formatBytes(totalMB * 1024 * 1024)}</strong></span>
                    <span>${t('dashDiskTotal')}: <strong>${totalGB} GB</strong></span>
                    <span>${t('dashDiskFree')}: <strong class="${remainGB < 50 ? 'text-danger' : remainGB < 100 ? 'text-warn' : 'text-success'}">${remainGB.toFixed(1)} GB</strong></span>
                  </div>`;
      }
      return `<div class="dash-disk-item">
                  <span class="dash-disk-name">${escapeHtml(s.name)}</span>
                  <span style="grid-column: 2 / -1; text-align:right; font-weight:600; color:var(--accent)">${formatBytes(totalMB * 1024 * 1024)} ${t('diskUsed')}</span>
                </div>`;
    }
    return '';
  }).filter(Boolean).join('') || `<p class="text-muted">--</p>`}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="dash-col">

        <!-- Alerts Summary -->
        <div class="dash-section">
          <h3 class="dash-section-title">${t('dashAlertsSummary')}</h3>
          ${alerts.length === 0 ? `
            <div class="dash-alert-ok">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>${t('dashAllHealthy')}</span>
            </div>
          ` : `
            <div class="dash-alert-list">
              ${alerts.map((a) => `<div class="dash-alert-item dash-alert-${a.type}">
                <span class="dash-alert-dot ${a.type === 'danger' ? 'offline' : ''}"></span>
                <strong>${escapeHtml(a.server)}</strong>: ${escapeHtml(a.msg)}
              </div>`).join('')}
            </div>
          `}
        </div>

        <!-- SSL Overview -->
        <div class="dash-section">
          <h3 class="dash-section-title">${t('dashSslOverview')}</h3>
          <div class="dash-stat-row">
            <div class="dash-stat-box">
              <span class="dash-stat-value text-success">${totalSslCerts - totalSslWarnings}</span>
              <span class="dash-stat-label">${t('dashCertsValid')}</span>
            </div>
            <div class="dash-stat-box">
              <span class="dash-stat-value ${totalSslWarnings > 0 ? 'text-warn' : 'text-success'}">${totalSslWarnings}</span>
              <span class="dash-stat-label">${t('dashCertsExpiring')}</span>
            </div>
            <div class="dash-stat-box">
              <span class="dash-stat-value">${totalSslCerts}</span>
              <span class="dash-stat-label">${t('dashSslCerts')}</span>
            </div>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="dash-section">
          <h3 class="dash-section-title">${t('dashQuickStats')}</h3>
          <div class="dash-stat-row">
            <div class="dash-stat-box">
              <span class="dash-stat-value ${totalEmailQueue > 100 ? 'text-danger' : totalEmailQueue > 20 ? 'text-warn' : 'text-success'}">${totalEmailQueue}</span>
              <span class="dash-stat-label">${t('dashEmailQueued')}</span>
            </div>
            <div class="dash-stat-box">
              <span class="dash-stat-value ${totalBackupFailed > 0 ? 'text-danger' : 'text-success'}">${totalBackupJobs}</span>
              <span class="dash-stat-label">${t('dashBackupJobs')}</span>
            </div>
            <div class="dash-stat-box">
              <span class="dash-stat-value">${totalServicesUp + totalServicesDown}</span>
              <span class="dash-stat-label">${t('dashServicesStatus')}</span>
            </div>
          </div>
        </div>

        <!-- Bandwidth Overview -->
        ${bwData && bwData.servers && bwData.servers.length > 0 ? `
        <div class="dash-section">
          <h3 class="dash-section-title">${t('dashBandwidth')} <small class="dash-section-sub">${formatBytes(bwData.grandTotal)} ${t('dashBwTotal')}</small></h3>
          <div class="dash-bw-list">
            ${bwData.servers.sort((a, b) => b.totalUsed - a.totalUsed).map((s) => {
    const maxBw = Math.max(...bwData.servers.map((x) => x.totalUsed), 1);
    const pct = Math.round((s.totalUsed / maxBw) * 100);
    return `<div class="dash-bw-item">
                <span class="dash-bw-name">${escapeHtml(s.name)}</span>
                <div class="dash-disk-bar-track"><div class="bw-bar-fill" style="width:${pct}%"></div></div>
                <span class="dash-bw-value">${formatBytes(s.totalUsed)}</span>
              </div>`;
  }).join('')}
          </div>
        </div>` : ''}

        <!-- S3 Buckets Mini -->
        ${s3Data && s3Data.buckets && s3Data.buckets.length > 0 ? `
        <div class="dash-section">
          <h3 class="dash-section-title">${t('dashS3Storage')} <small class="dash-section-action" onclick="switchTab('s3')">${t('dashViewDetails')} &rarr;</small></h3>
          <div class="dash-s3-list">
            ${s3Data.buckets.sort((a, b) => b.totalSize - a.totalSize).slice(0, 5).map((b) => {
    const maxSize = Math.max(...s3Data.buckets.map((x) => x.totalSize), 1);
    const pct = Math.round((b.totalSize / maxSize) * 100);
    return `<div class="dash-s3-item">
                <span class="dash-s3-name">${escapeHtml(b.name)}</span>
                <div class="dash-disk-bar-track"><div class="size-bar-fill" style="width:${pct}%"></div></div>
                <span class="dash-s3-size">${formatBytes(b.totalSize)}</span>
              </div>`;
  }).join('')}
          </div>
        </div>` : ''}

        <!-- Latest Updates -->
        ${updatesData && updatesData.releases && updatesData.releases.length > 0 ? `
        <div class="dash-section">
          <h3 class="dash-section-title">${t('dashLatestUpdates')} <small class="dash-section-action" onclick="switchTab('updates')">${t('dashViewDetails')} &rarr;</small></h3>
          <div class="dash-updates-list">
            ${updatesData.releases.slice(0, 5).map((r) => {
    const color = releaseTypeColors[r.type] || releaseTypeColors.other;
    const typeLabel = t(releaseTypeLabels[r.type] || 'releaseOther');
    return `<div class="dash-update-item">
                <span class="dash-update-badge" style="background:${color}20;color:${color}">${escapeHtml(typeLabel)}</span>
                <span class="dash-update-title">${escapeHtml(r.title.length > 60 ? r.title.substring(0, 60) + '...' : r.title)}</span>
                <span class="dash-update-date">${r.pubDate ? formatDateShort(r.pubDate) : ''}</span>
              </div>`;
  }).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>

    <!-- Server Pulse Monitor -->
    <div class="dash-section dash-pulse-section">
      <h3 class="dash-section-title">
        ${t('dashPulse')}
        <span class="pulse-live-badge"><span class="pulse-live-dot"></span>${t('dashPulseLive')}</span>
      </h3>
      <div class="pulse-monitor">
        ${servers.map((s) => `
          <div class="pulse-server" id="pulseServer${s.id}">
            <div class="pulse-server-header">
              <span class="pulse-server-name">${escapeHtml(s.name)}</span>
              <span class="pulse-server-ms" id="pulseMs${s.id}">--</span>
            </div>
            <div class="pulse-canvas-wrap">
              <canvas id="pulseCanvas${s.id}" class="pulse-canvas" height="80"></canvas>
            </div>
            <div class="pulse-server-status" id="pulseStatus${s.id}">
              <span class="pulse-status-dot"></span>
              <span class="pulse-status-text">--</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Uptime Tracker -->
    <div class="dash-section">
      <h3 class="dash-section-title">${t('dashUptime')}</h3>
      <div class="uptime-grid" id="uptimeGrid">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>

    <!-- Load History -->
    <div class="dash-section">
      <h3 class="dash-section-title">
        ${t('dashLoadHistory')}
        <div class="load-period-toggle">
          <button class="load-period-btn" onclick="switchLoadPeriod('1h')">${t('dashLoadHistory1h')}</button>
          <button class="load-period-btn" onclick="switchLoadPeriod('6h')">${t('dashLoadHistory6h')}</button>
          <button class="load-period-btn active" onclick="switchLoadPeriod('24h')">${t('dashLoadHistory24h')}</button>
        </div>
      </h3>
      <div id="loadHistoryContent">
        <div class="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  // Initialize pulse monitor after DOM is ready
  setTimeout(() => initPulseMonitor(servers), 100);

  // Load uptime data (show cache first, then refresh)
  setTimeout(async () => {
    try {
      const cached = localStorage.getItem('uptime_cache');
      if (cached) renderUptimeSection(JSON.parse(cached));
      const res = await fetch('/api/whm/servers/uptime');
      const data = await res.json();
      try { localStorage.setItem('uptime_cache', JSON.stringify(data)); } catch { }
      renderUptimeSection(data);
    } catch {
      const el = document.getElementById('uptimeGrid');
      if (el && !localStorage.getItem('uptime_cache')) el.innerHTML = `<p class="text-muted">${t('dashUptimeNoData')}</p>`;
    }
  }, 200);

  // Load history data
  setTimeout(() => loadAllLoadHistory('24h'), 300);
}

// ── Uptime Section ──
function renderUptimeSection(data) {
  const grid = document.getElementById('uptimeGrid');
  if (!grid) return;
  if (!data.servers || data.servers.length === 0 || data.servers.every((s) => s.totalSamples === 0)) {
    grid.innerHTML = `<p class="text-muted">${t('dashUptimeNoData')}</p>`;
    return;
  }
  grid.innerHTML = data.servers.map((s) => {
    const fmt = (v) => v != null ? v.toFixed(2) : '--';
    const color = (v) => v == null ? '' : v >= 99.9 ? 'text-success' : v >= 99 ? 'text-warn' : 'text-danger';
    return `<div class="uptime-server">
      <span class="uptime-server-name">${escapeHtml(s.name)}</span>
      <div class="uptime-bars">
        <span class="uptime-period">${t('dashUptime24h')}: <strong class="${color(s.uptime24h)}">${fmt(s.uptime24h)}%</strong></span>
        <span class="uptime-period">${t('dashUptime7d')}: <strong class="${color(s.uptime7d)}">${fmt(s.uptime7d)}%</strong></span>
        <span class="uptime-period">${t('dashUptime30d')}: <strong class="${color(s.uptime30d)}">${fmt(s.uptime30d)}%</strong></span>
      </div>
    </div>`;
  }).join('');
}

// ── Load History ──
let currentLoadPeriod = '24h';

function switchLoadPeriod(period) {
  currentLoadPeriod = period;
  document.querySelectorAll('.load-period-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.trim() === t(`dashLoadHistory${period}`));
  });
  loadAllLoadHistory(period);
}

async function loadAllLoadHistory(period) {
  const container = document.getElementById('loadHistoryContent');
  if (!container) return;

  const servers = window._lastWhmData?.servers || [];
  if (servers.length === 0) { container.innerHTML = `<p class="text-muted">${t('dashLoadHistoryNoData')}</p>`; return; }

  // Show cached load history first
  const cacheKey = `loadhistory_cache`;
  const cachedLoad = (() => { try { return JSON.parse(localStorage.getItem(cacheKey)); } catch { return null; } })();

  function renderLoadResults(allData, period) {
    const hoursBack = period === '1h' ? 1 : period === '6h' ? 6 : 24;
    const cutoff = Date.now() - hoursBack * 3600000;
    let html = '';
    allData.forEach((data) => {
      const samples = (data.samples || []).filter((s) => s.ts > cutoff);
      if (samples.length < 2) return;
      const canvasId = `loadChart${data.serverId}`;
      html += `<div class="load-chart-item">
        <span class="load-chart-name">${escapeHtml(data.serverName)}</span>
        <div class="load-canvas-wrap"><canvas id="${canvasId}" class="load-canvas" height="100"></canvas></div>
        <div class="load-chart-legend">
          <span class="load-legend-item"><span class="load-legend-dot" style="background:#4caf50"></span>1m</span>
          <span class="load-legend-item"><span class="load-legend-dot" style="background:#ff9800"></span>5m</span>
          <span class="load-legend-item"><span class="load-legend-dot" style="background:#f44336"></span>15m</span>
        </div>
      </div>`;
    });
    if (!html) { container.innerHTML = `<p class="text-muted">${t('dashLoadHistoryNoData')}</p>`; return; }
    container.innerHTML = html;
    allData.forEach((data) => {
      const samples = (data.samples || []).filter((s) => s.ts > cutoff);
      if (samples.length >= 2) drawLoadChart(`loadChart${data.serverId}`, samples);
    });
  }

  if (cachedLoad) renderLoadResults(cachedLoad, period);
  else container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const results = await Promise.allSettled(
      servers.filter((s) => s.online).map(async (s) => {
        const res = await fetch(`/api/whm/server/${s.id}/loadhistory`);
        return res.json();
      })
    );
    const allData = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    try { localStorage.setItem(cacheKey, JSON.stringify(allData)); } catch { }
    renderLoadResults(allData, period);
  } catch {
    if (!cachedLoad) container.innerHTML = `<p class="text-muted">${t('dashLoadHistoryNoData')}</p>`;
  }
}

function drawLoadChart(canvasId, samples) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrap = canvas.parentElement;
  canvas.width = wrap.offsetWidth;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;

  // Background
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim() || '#1a2733';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border').trim() || '#2a3a4e';
  ctx.lineWidth = 0.5;
  for (let y = 20; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Find max load for scaling
  const maxLoad = Math.max(2, ...samples.map((s) => Math.max(s.one || 0, s.five || 0, s.fifteen || 0))) * 1.2;

  const lines = [
    { key: 'one', color: '#4caf50' },
    { key: 'five', color: '#ff9800' },
    { key: 'fifteen', color: '#f44336' },
  ];

  lines.forEach((line) => {
    ctx.beginPath();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    samples.forEach((s, i) => {
      const x = (i / (samples.length - 1)) * w;
      const y = h - 8 - ((s[line.key] || 0) / maxLoad) * (h - 16);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  // Y-axis label
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#8899a6';
  ctx.font = '10px sans-serif';
  ctx.fillText(maxLoad.toFixed(1), 4, 12);
  ctx.fillText('0', 4, h - 4);
}

// ── Server Pulse Monitor ──
let pulseInterval = null;
const pulseData = {}; // { serverId: { points: [], canvas, ctx } }
const PULSE_MAX_POINTS = 60;

function initPulseMonitor(servers) {
  // Stop any existing pulse
  if (pulseInterval) { clearInterval(pulseInterval); pulseInterval = null; }

  // Restore cached pulse data
  let cachedPulse = {};
  try { cachedPulse = JSON.parse(localStorage.getItem('pulse_cache') || '{}'); } catch { }

  servers.forEach((s) => {
    const canvas = document.getElementById(`pulseCanvas${s.id}`);
    if (!canvas) return;
    const wrap = canvas.parentElement;
    canvas.width = wrap.offsetWidth;
    const ctx = canvas.getContext('2d');
    const restored = cachedPulse[s.id];
    pulseData[s.id] = { points: restored?.points || [], canvas, ctx, online: restored?.online ?? s.online };
    drawPulseGrid(ctx, canvas);
    if (pulseData[s.id].points.length > 1) drawPulseLine(pulseData[s.id]);
  });

  // Handle resize
  window.addEventListener('resize', () => {
    Object.values(pulseData).forEach((pd) => {
      if (pd.canvas && pd.canvas.parentElement) {
        pd.canvas.width = pd.canvas.parentElement.offsetWidth;
        drawPulseLine(pd);
      }
    });
  });

  // First fetch immediately
  fetchPulse();
  // Then every 3 seconds
  pulseInterval = setInterval(fetchPulse, 3000);
}

async function fetchPulse() {
  if (currentTab !== 'dashboard') return;
  try {
    const res = await fetch('/api/whm/servers/pulse');
    const data = await res.json();
    data.servers.forEach((s) => {
      if (!pulseData[s.id]) return;
      const pd = pulseData[s.id];
      pd.online = s.online;
      pd.points.push({ time: Date.now(), ms: s.online ? s.responseTime : -1 });
      if (pd.points.length > PULSE_MAX_POINTS) pd.points.shift();

      // Update ms display
      const msEl = document.getElementById(`pulseMs${s.id}`);
      if (msEl) {
        if (s.online) {
          msEl.textContent = s.responseTime + t('dashPulseMs');
          msEl.className = 'pulse-server-ms ' + (s.responseTime < 500 ? 'pulse-good' : s.responseTime < 1500 ? 'pulse-warn' : 'pulse-bad');
        } else {
          msEl.textContent = t('dashPulseOffline');
          msEl.className = 'pulse-server-ms pulse-bad';
        }
      }

      // Update status
      const statusEl = document.getElementById(`pulseStatus${s.id}`);
      if (statusEl) {
        const recent = pd.points.slice(-10);
        const avgMs = recent.filter((p) => p.ms > 0).reduce((sum, p) => sum + p.ms, 0) / Math.max(1, recent.filter((p) => p.ms > 0).length);
        const offlineCount = recent.filter((p) => p.ms < 0).length;
        let statusClass, statusText;
        if (offlineCount > 3 || !s.online) {
          statusClass = 'pulse-status-down';
          statusText = t('dashPulseDown');
        } else if (avgMs > 1000 || offlineCount > 0) {
          statusClass = 'pulse-status-unstable';
          statusText = t('dashPulseUnstable');
        } else {
          statusClass = 'pulse-status-stable';
          statusText = t('dashPulseStable');
        }
        statusEl.innerHTML = `<span class="pulse-status-dot ${statusClass}"></span><span class="pulse-status-text ${statusClass}">${statusText}</span>`;
      }

      // Redraw canvas
      drawPulseLine(pd);
    });
    // Save pulse points to localStorage
    const cached = {};
    Object.entries(pulseData).forEach(([id, pd]) => { cached[id] = { points: pd.points.slice(-PULSE_MAX_POINTS), online: pd.online }; });
    try { localStorage.setItem('pulse_cache', JSON.stringify(cached)); } catch { }
  } catch { /* silent fail */ }
}

function drawPulseGrid(ctx, canvas) {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-secondary').trim() || '#1a2733';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border').trim() || '#2a3a4e';
  ctx.lineWidth = 0.5;
  for (let y = 20; y < h; y += 20) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let x = 0; x < w; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
}

function drawPulseLine(pd) {
  const { canvas, ctx, points } = pd;
  const w = canvas.width, h = canvas.height;

  drawPulseGrid(ctx, canvas);

  if (points.length < 2) return;

  // Map response times to Y positions (lower ms = lower on screen = healthy)
  // Range: 0ms = bottom, 3000ms+ = top
  const maxMs = 3000;

  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Draw glow
  ctx.save();
  ctx.shadowColor = '#4caf50';
  ctx.shadowBlur = 6;

  const step = w / (PULSE_MAX_POINTS - 1);

  // Create gradient line based on response time
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = (PULSE_MAX_POINTS - points.length + i) * step;
    let y;
    if (p.ms < 0) {
      // Offline: flat line at top
      y = 8;
    } else {
      // Map ms to Y: fast=bottom, slow=top
      const ratio = Math.min(p.ms / maxMs, 1);
      y = 8 + (1 - ratio) * (h - 16);
      // Add heartbeat spike effect for visual appeal
      if (i > 0 && i % 5 === 0 && p.ms > 0) {
        // Create ECG-like spike
        const spikeX = x - step * 0.3;
        const baseY = y;
        ctx.lineTo(spikeX, baseY);
        ctx.lineTo(spikeX + step * 0.1, baseY - 18);
        ctx.lineTo(spikeX + step * 0.2, baseY + 12);
        ctx.lineTo(spikeX + step * 0.35, baseY - 6);
        ctx.lineTo(x, y);
        return;
      }
    }
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  // Color based on latest state
  const lastPoint = points[points.length - 1];
  if (lastPoint.ms < 0) {
    ctx.strokeStyle = '#f44336';
  } else if (lastPoint.ms < 500) {
    ctx.strokeStyle = '#4caf50';
  } else if (lastPoint.ms < 1500) {
    ctx.strokeStyle = '#ff9800';
  } else {
    ctx.strokeStyle = '#f44336';
  }
  ctx.stroke();
  ctx.restore();

  // Draw current point (blinking dot)
  const lastX = (PULSE_MAX_POINTS - 1) * step;
  let lastY;
  if (lastPoint.ms < 0) {
    lastY = 8;
  } else {
    lastY = 8 + (1 - Math.min(lastPoint.ms / maxMs, 1)) * (h - 16);
  }

  ctx.beginPath();
  ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle || '#4caf50';
  ctx.fill();

  // Glow ring
  ctx.beginPath();
  ctx.arc(lastX, lastY, 7, 0, Math.PI * 2);
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ── Health Score ──
function computeHealthScore(s) {
  if (!s.online) return 0;
  let score = 0;
  // Disk (25 pts)
  const maxDisk = s.disk?.reduce((mx, d) => Math.max(mx, d.percentage || 0), 0) || 0;
  if (maxDisk < 75) score += 25;
  else if (maxDisk < 90) score += 15;
  else if (maxDisk < 95) score += 5;
  // Services (25 pts)
  const criticalNames = ['httpd', 'mysqld', 'exim', 'named', 'sshd'];
  const critical = s.services?.filter((svc) => criticalNames.some((n) => svc.name.includes(n))) || [];
  const allUp = critical.every((svc) => svc.running);
  if (allUp) score += 25;
  else score += Math.max(0, 25 - critical.filter((svc) => !svc.running).length * 8);
  // SSL (25 pts)
  if (s.sslTotal > 0 && s.sslWarnings === 0) score += 25;
  else if (s.sslWarnings > 0) score += 10;
  else score += 20;
  // Backup (25 pts)
  if (s.backupAvailable && s.backupFailed === 0) score += 25;
  else if (s.backupAvailable) score += 10;
  else score += 15;
  return Math.min(100, score);
}

function getHealthColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--danger)';
}

// ── Alert System ──
function computeAlerts(data) {
  if (!data?.servers) return [];
  const alerts = [];
  data.servers.forEach((s) => {
    if (!s.online) { alerts.push({ type: 'danger', server: s.name, msg: t('serverOffline') }); return; }
    if (s.sslWarnings > 0) alerts.push({ type: 'warning', server: s.name, msg: `${s.sslWarnings} ${t('alertSslExpiring')}` });
    const criticalNames = ['httpd', 'mysqld', 'exim', 'named', 'sshd'];
    const downServices = (s.services || []).filter((svc) => criticalNames.some((n) => svc.name.includes(n)) && !svc.running);
    if (downServices.length > 0) alerts.push({ type: 'danger', server: s.name, msg: `${downServices.length} ${t('alertServiceDown')}` });
    const maxDisk = (s.disk || []).reduce((mx, d) => Math.max(mx, d.percentage || 0), 0);
    if (maxDisk >= 90) alerts.push({ type: 'danger', server: s.name, msg: `${t('alertDiskHigh')} (${maxDisk}%)` });
    else if (maxDisk >= 75) alerts.push({ type: 'warning', server: s.name, msg: `${t('alertDiskHigh')} (${maxDisk}%)` });
    if (s.emailQueueSize > 100) alerts.push({ type: 'danger', server: s.name, msg: `${t('alertEmailQueue')} (${s.emailQueueSize})` });
    else if (s.emailQueueSize > 20) alerts.push({ type: 'warning', server: s.name, msg: `${t('alertEmailQueue')} (${s.emailQueueSize})` });
  });
  return alerts;
}

function updateAlerts(data) {
  const alerts = computeAlerts(data);
  const countEl = document.getElementById('alertCount');
  const dropdown = document.getElementById('alertDropdown');
  if (alerts.length === 0) {
    countEl.classList.add('hidden');
    dropdown.innerHTML = `<div class="alert-item alert-ok">${t('noAlerts')}</div>`;
  } else {
    countEl.textContent = alerts.length;
    countEl.classList.remove('hidden');
    dropdown.innerHTML = alerts.map((a) => `<div class="alert-item alert-${a.type}"><strong>${escapeHtml(a.server)}</strong>: ${escapeHtml(a.msg)}</div>`).join('');
  }
}

function toggleAlerts() {
  document.getElementById('alertDropdown').classList.toggle('hidden');
  document.getElementById('toolsDropdown')?.classList.add('hidden');
}

function toggleToolsMenu() {
  document.getElementById('toolsDropdown').classList.toggle('hidden');
  document.getElementById('alertDropdown')?.classList.add('hidden');
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.alert-bell')) document.getElementById('alertDropdown')?.classList.add('hidden');
  if (!e.target.closest('.tools-menu')) document.getElementById('toolsDropdown')?.classList.add('hidden');
});

// ── CSV Export ──
function exportCSV() {
  if (currentTab === 'dashboard' && window._lastWhmData) {
    const rows = [['Server', 'Host', 'Online', 'Accounts', 'Load 1m', 'Disk %', 'SSL Certs', 'SSL Warnings', 'Email Queue', 'Backup Jobs', 'Health Score']];
    window._lastWhmData.servers.forEach((s) => {
      const maxDisk = (s.disk || []).reduce((mx, d) => Math.max(mx, d.percentage || 0), 0);
      rows.push([s.name, s.host, s.online, s.accounts || 0, s.load?.one || '', maxDisk, s.sslTotal || 0, s.sslWarnings || 0, s.emailQueueSize || 0, s.backupJobs || 0, s.online ? computeHealthScore(s) : 0]);
    });
    downloadCSV(rows, 'dashboard-overview.csv');
  } else if (currentTab === 's3' && window._lastS3Data) {
    const rows = [['Bucket', 'Region', 'Size (Bytes)', 'Objects', 'Created']];
    window._lastS3Data.buckets.forEach((b) => rows.push([b.name, b.region, b.totalSize, b.totalObjects, b.creationDate]));
    downloadCSV(rows, 's3-buckets.csv');
  } else if (currentTab === 'whm' && window._lastWhmData) {
    const rows = [['Server', 'Host', 'Online', 'Accounts', 'Load 1m', 'SSL Warnings', 'Email Queue', 'Health Score']];
    window._lastWhmData.servers.forEach((s) => rows.push([s.name, s.host, s.online, s.accounts || 0, s.load?.one || '', s.sslWarnings || 0, s.emailQueueSize || 0, s.online ? computeHealthScore(s) : 0]));
    downloadCSV(rows, 'servers-overview.csv');
  } else if (currentTab === 'updates' && window._lastUpdatesData) {
    const rows = [['Title', 'Type', 'Description', 'Link']];
    window._lastUpdatesData.releases.forEach((r) => rows.push([r.title, r.type, r.description.substring(0, 200), r.link]));
    downloadCSV(rows, 'cpanel-releases.csv');
  }
}

function downloadCSV(rows, filename) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════════════════════
// UPDATES TAB
// ══════════════════════════════════════════════

const releaseTypeLabels = {
  all: 'releaseAll',
  cpanel: 'releaseCpanel',
  easyapache: 'releaseEasyapache',
  wordpress: 'releaseWordpress',
  security: 'releaseSecurity',
  backup: 'releaseBackup',
  webserver: 'releaseWebserver',
  cloudlinux: 'releaseCloudlinux',
  monitoring: 'releaseMonitoring',
  other: 'releaseOther',
  vulnerability: 'releaseVulnerability',
  'wordpress-sec': 'releaseWpSec',
  cisa: 'releaseCisa',
};

const releaseTypeColors = {
  cpanel: '#ff9900',
  easyapache: '#2196f3',
  wordpress: '#21759b',
  security: '#f44336',
  backup: '#4caf50',
  webserver: '#9c27b0',
  cloudlinux: '#00bcd4',
  monitoring: '#ff5722',
  other: '#9e9e9e',
  vulnerability: '#e53935',
  'wordpress-sec': '#21759b',
  cisa: '#d32f2f',
};

async function loadUpdatesData() {
  document.getElementById('updatesLoading').classList.remove('hidden');
  document.getElementById('releaseList').innerHTML = '';
  document.getElementById('updatesError').classList.add('hidden');

  try {
    const res = await fetch('/api/cpanel/releases');
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
    const data = await res.json();
    window._lastUpdatesData = data;
    renderReleases(data);
  } catch (err) {
    document.getElementById('updatesLoading').classList.add('hidden');
    document.getElementById('updatesError').classList.remove('hidden');
    document.getElementById('updatesErrorMsg').textContent = t('errorPrefix') + err.message;
  }
}

function renderReleases(data) {
  window._lastUpdatesData = data;
  const list = document.getElementById('releaseList');
  const loading = document.getElementById('updatesLoading');
  loading.classList.add('hidden');
  document.getElementById('updatesError').classList.add('hidden');

  document.getElementById('totalReleases').textContent = data.total;

  const badge = document.getElementById('updatesBadge');
  badge.textContent = data.total;
  badge.classList.remove('hidden');

  // Build filter buttons
  const types = ['all', ...new Set(data.releases.map((r) => r.type))];
  const filtersEl = document.getElementById('releaseFilters');
  filtersEl.innerHTML = types.map((type) => {
    const count = type === 'all' ? data.total : data.releases.filter((r) => r.type === type).length;
    return `<button class="release-filter-btn ${currentReleaseFilter === type ? 'active' : ''}" onclick="filterReleases('${type}')">${t(releaseTypeLabels[type] || 'releaseOther')} <span class="filter-count">${count}</span></button>`;
  }).join('');

  // Filter releases
  let filtered = data.releases;
  if (currentReleaseFilter !== 'all') {
    filtered = filtered.filter((r) => r.type === currentReleaseFilter);
  }

  // Apply search
  const searchQuery = (document.getElementById('releaseSearch')?.value || '').toLowerCase().trim();
  if (searchQuery.length >= 2) {
    filtered = filtered.filter((r) =>
      r.title.toLowerCase().includes(searchQuery) ||
      r.description.toLowerCase().includes(searchQuery)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="loading"><p>${t('noReleases')}</p></div>`;
    return;
  }

  const sourceLabels = { cpanel: 'cPanel', hackernews: 'The Hacker News', wordfence: 'Wordfence', cisa: 'CISA' };

  list.innerHTML = filtered.map((r) => {
    const color = releaseTypeColors[r.type] || releaseTypeColors.other;
    const typeLabel = t(releaseTypeLabels[r.type] || 'releaseOther');
    const descPreview = r.description.length > 200 ? r.description.substring(0, 200) + '...' : r.description;
    const srcLabel = sourceLabels[r.source] || r.source || '';
    const dateStr = r.pubDate ? new Date(r.pubDate).toLocaleDateString() : '';

    return `
      <div class="release-card">
        <div class="release-card-header">
          <span class="release-type-badge" style="background: ${color}20; color: ${color}; border: 1px solid ${color}40">${escapeHtml(typeLabel)}</span>
          <h3 class="release-title">${escapeHtml(r.title)}</h3>
          <div class="release-meta">
            ${srcLabel ? `<span class="release-source">${escapeHtml(srcLabel)}</span>` : ''}
            ${dateStr ? `<span class="release-date">${dateStr}</span>` : ''}
          </div>
        </div>
        <p class="release-desc">${escapeHtml(descPreview)}</p>
        ${r.link ? `<a href="${escapeHtml(r.link)}" target="_blank" rel="noopener" class="release-link">${t('readMore')} &rarr;</a>` : ''}
      </div>`;
  }).join('');
}

function filterReleases(type) {
  currentReleaseFilter = type;
  if (window._lastUpdatesData) renderReleases(window._lastUpdatesData);
}

function initReleaseSearch() {
  const input = document.getElementById('releaseSearch');
  if (!input) return;
  let debounce = null;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (window._lastUpdatesData) renderReleases(window._lastUpdatesData);
    }, 300);
  });
}

// ── Account Search ──
let searchDebounce = null;

function initSearch() {
  const input = document.getElementById('accountSearch');
  if (!input) return;
  input.addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    const query = e.target.value.trim();
    if (query.length < 2) {
      document.getElementById('searchResults').classList.add('hidden');
      document.getElementById('serverGrid').classList.remove('hidden');
      return;
    }
    searchDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/whm/accounts/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        renderSearchResults(data);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 300);
  });
}

function renderSearchResults(data) {
  const container = document.getElementById('searchResults');
  const grid = document.getElementById('serverGrid');

  if (data.results.length === 0) {
    container.innerHTML = `<div class="no-results">${t('noResults')} "${escapeHtml(data.query)}"</div>`;
  } else {
    container.innerHTML = `
      <h3 class="search-title">${data.totalMatches} ${t('resultsFor')} "${escapeHtml(data.query)}"</h3>
      <div class="table-wrapper">
        <table class="accounts-table">
          <thead>
            <tr>
              <th>${t('domain')}</th>
              <th>${t('user')}</th>
              <th>${t('server')}</th>
              <th>${t('diskUsed')}</th>
              <th>${t('plan')}</th>
              <th>${t('status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${data.results.map((a) => {
      const whmUrl = `https://${a.serverHost || ''}:${a.serverPort || '2087'}`;
      return `
              <tr class="${a.suspended ? 'row-suspended' : ''}">
                <td><strong>${escapeHtml(a.domain)}</strong></td>
                <td>${escapeHtml(a.user)}</td>
                <td><span class="server-badge">${escapeHtml(a.serverName)}</span></td>
                <td>${escapeHtml(a.diskused)}</td>
                <td>${escapeHtml(a.plan)}</td>
                <td><span class="status-badge ${a.suspended ? 'badge-suspended' : 'badge-active'}">${a.suspended ? t('suspended') : t('active')}</span></td>
                <td><a href="${whmUrl}" target="_blank" rel="noopener" class="btn-cpanel" onclick="event.stopPropagation()">WHM</a></td>
              </tr>`;
    }).join('')}
          </tbody>
        </table>
      </div>`;
  }
  container.classList.remove('hidden');
  grid.classList.add('hidden');
}

// ── Refresh Button ──
function handleRefresh() {
  if (currentTab === 'dashboard') { dashboardDataLoaded = false; loadDashboard(); }
  else if (currentTab === 's3') loadData();
  else if (currentTab === 'whm') loadWhmData();
  else if (currentTab === 'updates') loadUpdatesData();
  else if (currentTab === 'allsites') { allSitesDataLoaded = false; loadAllSites(); }
  else if (currentTab === 'settings') { settingsDataLoaded = false; loadSettings(); }
}

// ══════════════════════════════════════════════
// SSH COMPONENTS (Terminal, SFTP, Editor)
// ══════════════════════════════════════════════

function renderSSHDetailTabs() {
  const nav = document.querySelector('#serverDetail .detail-tabs');
  nav.innerHTML = `
    <button class="detail-tab active" data-dtab="terminal" onclick="switchDetailTab('terminal')">${t('sshTerminal')}</button>
    <button class="detail-tab" data-dtab="ftp" onclick="switchDetailTab('ftp')">${t('sshFtp')}</button>
  `;
}

function renderCpanelDetailTabs(hasSSH) {
  const nav = document.querySelector('#serverDetail .detail-tabs');
  let tabs = `
    <button class="detail-tab active" data-dtab="accounts" onclick="switchDetailTab('accounts')">${t('accounts')}</button>
    <button class="detail-tab" data-dtab="services" onclick="switchDetailTab('services')">${t('services')}</button>
    <button class="detail-tab" data-dtab="logs" onclick="switchDetailTab('logs')">${t('logs')}</button>
    <button class="detail-tab" data-dtab="backups" onclick="switchDetailTab('backups')">${t('backups')}</button>
    <button class="detail-tab" data-dtab="ssl" onclick="switchDetailTab('ssl')">${t('ssl')}</button>
    <button class="detail-tab" data-dtab="email" onclick="switchDetailTab('email')">${t('email')}</button>
    <button class="detail-tab" data-dtab="php" onclick="switchDetailTab('php')">PHP</button>
    <button class="detail-tab" data-dtab="mysql" onclick="switchDetailTab('mysql')">MySQL</button>
    <button class="detail-tab" data-dtab="dns" onclick="switchDetailTab('dns')">DNS</button>
    <button class="detail-tab" data-dtab="bandwidth" onclick="switchDetailTab('bandwidth')">${t('bandwidth')}</button>
    <button class="detail-tab" data-dtab="cron" onclick="switchDetailTab('cron')">${t('cron')}</button>
    <button class="detail-tab" data-dtab="ports" onclick="switchDetailTab('ports')">${t('ports')}</button>
    <button class="detail-tab" data-dtab="blacklist" onclick="switchDetailTab('blacklist')">${t('blacklist')}</button>
    <button class="detail-tab" data-dtab="security" onclick="switchDetailTab('security')">${t('security')}</button>
    <button class="detail-tab" data-dtab="emailauth" onclick="switchDetailTab('emailauth')">${t('emailAuth')}</button>
    <button class="detail-tab" data-dtab="packages" onclick="switchDetailTab('packages')">${t('packages')}</button>
  `;
  if (hasSSH) {
    tabs += `
    <button class="detail-tab ssh-tab" data-dtab="terminal" onclick="switchDetailTab('terminal')">${t('sshTerminal')}</button>
    <button class="detail-tab ssh-tab" data-dtab="ftp" onclick="switchDetailTab('ftp')">${t('sshFtp')}</button>
    `;
  }
  nav.innerHTML = tabs;
}

// ── Terminal Component ──
function renderTerminalPanel() {
  const content = document.getElementById('detailContent');
  const server = window._lastWhmData?.servers?.find((s) => s.id === currentDetailServerId);

  if (server?.accessLevel !== 'readwrite') {
    content.innerHTML = `<div class="ssh-access-denied">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      <p>${t('sshAccessDenied')}</p>
    </div>`;
    return;
  }

  content.innerHTML = `
    <div class="ssh-terminal-toolbar">
      <button class="btn btn-refresh btn-sm" id="sshConnectBtn" onclick="toggleSSHConnection()">
        ${t('sshConnect')}
      </button>
      <span class="ssh-status" id="sshStatus">${t('sshDisconnected')}</span>
    </div>
    <div class="ssh-terminal-container" id="sshTerminalContainer"></div>
  `;

  if (_sshTerminal) _sshTerminal.dispose();

  _sshTerminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
    theme: {
      background: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#0f1923',
      foreground: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#e8eaed',
      cursor: '#ff9900',
      selectionBackground: 'rgba(255, 153, 0, 0.3)',
    },
    allowProposedApi: true,
  });

  _sshFitAddon = new FitAddon.FitAddon();
  _sshTerminal.loadAddon(_sshFitAddon);
  if (typeof WebLinksAddon !== 'undefined') {
    _sshTerminal.loadAddon(new WebLinksAddon.WebLinksAddon());
  }

  const container = document.getElementById('sshTerminalContainer');
  _sshTerminal.open(container);
  _sshFitAddon.fit();

  const resizeObserver = new ResizeObserver(() => {
    if (_sshFitAddon) {
      _sshFitAddon.fit();
      if (_sshWebSocket && _sshWebSocket.readyState === WebSocket.OPEN) {
        _sshWebSocket.send(JSON.stringify({ type: 'resize', cols: _sshTerminal.cols, rows: _sshTerminal.rows }));
      }
    }
  });
  resizeObserver.observe(container);

  _sshTerminal.onData((data) => {
    if (_sshWebSocket && _sshWebSocket.readyState === WebSocket.OPEN) {
      const bytes = new TextEncoder().encode(data);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      _sshWebSocket.send(JSON.stringify({ type: 'data', data: btoa(binary) }));
    }
  });
}

function toggleSSHConnection() {
  if (_sshConnected) { disconnectSSH(); } else { connectSSH(); }
}

function connectSSH() {
  const statusEl = document.getElementById('sshStatus');
  const btnEl = document.getElementById('sshConnectBtn');
  statusEl.textContent = t('sshConnecting');
  btnEl.textContent = t('sshConnecting');
  btnEl.disabled = true;

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  _sshWebSocket = new WebSocket(`${protocol}//${location.host}/ws/ssh/${currentDetailServerId}`);

  _sshWebSocket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'data') {
        const raw = atob(msg.data);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        _sshTerminal.write(bytes);
      } else if (msg.type === 'status') {
        if (msg.status === 'connected') {
          _sshConnected = true;
          document.getElementById('sshTerminalContainer')?.classList.add('connected');
          statusEl.textContent = t('sshConnected');
          statusEl.className = 'ssh-status ssh-status-connected';
          btnEl.textContent = t('sshDisconnect');
          btnEl.disabled = false;
          btnEl.className = 'btn btn-danger-outline btn-sm';
          _sshWebSocket.send(JSON.stringify({ type: 'resize', cols: _sshTerminal.cols, rows: _sshTerminal.rows }));
        } else if (msg.status === 'disconnected') {
          handleSSHDisconnect();
        }
      } else if (msg.type === 'error') {
        _sshTerminal.writeln(`\r\n\x1b[31m${t('sshConnectionError')}: ${msg.message}\x1b[0m`);
        handleSSHDisconnect();
      }
    } catch { /* ignore parse errors */ }
  };

  _sshWebSocket.onclose = () => handleSSHDisconnect();
  _sshWebSocket.onerror = () => {
    _sshTerminal.writeln(`\r\n\x1b[31m${t('sshConnectionError')}\x1b[0m`);
    handleSSHDisconnect();
  };
}

function disconnectSSH() {
  if (_sshWebSocket) { _sshWebSocket.close(); _sshWebSocket = null; }
  handleSSHDisconnect();
}

function handleSSHDisconnect() {
  _sshConnected = false;
  document.getElementById('sshTerminalContainer')?.classList.remove('connected');
  const statusEl = document.getElementById('sshStatus');
  const btnEl = document.getElementById('sshConnectBtn');
  if (statusEl) { statusEl.textContent = t('sshDisconnected'); statusEl.className = 'ssh-status'; }
  if (btnEl) { btnEl.textContent = t('sshConnect'); btnEl.disabled = false; btnEl.className = 'btn btn-refresh btn-sm'; }
}

// ── Unified FTP Panel (File Browser + Editor) ──
function renderFTPPanel() {
  if (_syncActive) { renderSyncPanel(); return; }
  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <div class="ftp-panel" id="ftpPanel">
      <div class="ftp-file-list" id="ftpFileList">
        <div class="loading"><div class="spinner"></div></div>
      </div>
      <div class="ftp-editor-pane" id="ftpEditorPane"></div>
    </div>
  `;
  renderSFTPBrowser();
}

// ── File type icons (VS Code style badges) ──
function sftpFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const colors = {
    js:'#CBCB41', ts:'#3178C6', jsx:'#00D8FF', tsx:'#3178C6',
    php:'#8892BF', py:'#3776AB', rb:'#CC342D', go:'#00ADD8', rs:'#DEA584',
    java:'#E76F00', c:'#A8B9CC', cpp:'#00599C', cs:'#68217A', h:'#A8B9CC',
    html:'#E44D26', htm:'#E44D26', css:'#1572B6', scss:'#CF649A', less:'#1D365D', sass:'#CF649A',
    json:'#CBCB41', xml:'#E44D26', yml:'#CB171E', yaml:'#CB171E', toml:'#9C4121',
    md:'#519ABA', txt:'#6B7280', log:'#6B7280', csv:'#16A34A',
    sh:'#4EAA25', bash:'#4EAA25', zsh:'#4EAA25', bat:'#C1F12E', ps1:'#012456',
    sql:'#E38C00', db:'#E38C00',
    jpg:'#26A69A', jpeg:'#26A69A', png:'#26A69A', gif:'#26A69A', svg:'#FFB13B',
    webp:'#26A69A', ico:'#26A69A', bmp:'#26A69A',
    zip:'#E54C21', tar:'#E54C21', gz:'#E54C21', bz2:'#E54C21', rar:'#E54C21', '7z':'#E54C21', tgz:'#E54C21',
    pdf:'#EC1C24', doc:'#2B579A', docx:'#2B579A', xls:'#217346', xlsx:'#217346', ppt:'#D24726', pptx:'#D24726',
    env:'#EDB200', gitignore:'#F05032', dockerignore:'#2496ED', dockerfile:'#2496ED',
    vue:'#42B883', svelte:'#FF3E00', dart:'#00B4AB', kt:'#A97BFF', swift:'#FA7343',
    conf:'#6B7280', cfg:'#6B7280', ini:'#6B7280', htaccess:'#E44D26',
    lock:'#6B7280', map:'#6B7280', min:'#6B7280',
    mp3:'#E91E63', mp4:'#E91E63', wav:'#E91E63', avi:'#E91E63', mkv:'#E91E63', mov:'#E91E63',
    ttf:'#6B7280', woff:'#6B7280', woff2:'#6B7280', eot:'#6B7280', otf:'#6B7280',
  };
  // Display label (short uppercase)
  const labels = {
    js:'JS', ts:'TS', jsx:'JSX', tsx:'TSX',
    php:'PHP', py:'PY', rb:'RB', go:'GO', rs:'RS',
    java:'JAV', c:'C', cpp:'C++', cs:'C#', h:'H',
    html:'HTML', htm:'HTM', css:'CSS', scss:'SCSS', less:'LESS', sass:'SASS',
    json:'JSON', xml:'XML', yml:'YML', yaml:'YAML', toml:'TOML',
    md:'MD', txt:'TXT', log:'LOG', csv:'CSV',
    sh:'SH', bash:'SH', zsh:'SH', bat:'BAT', ps1:'PS1',
    sql:'SQL', db:'DB',
    jpg:'JPG', jpeg:'JPG', png:'PNG', gif:'GIF', svg:'SVG',
    webp:'WEBP', ico:'ICO', bmp:'BMP',
    zip:'ZIP', tar:'TAR', gz:'GZ', bz2:'BZ2', rar:'RAR', '7z':'7Z', tgz:'TGZ',
    pdf:'PDF', doc:'DOC', docx:'DOCX', xls:'XLS', xlsx:'XLSX', ppt:'PPT', pptx:'PPTX',
    env:'ENV', gitignore:'GIT', dockerignore:'DOC', dockerfile:'DOC',
    vue:'VUE', svelte:'SVL', dart:'DART', kt:'KT', swift:'SWF',
    conf:'CONF', cfg:'CFG', ini:'INI', htaccess:'HTA',
    lock:'LOCK', map:'MAP',
    mp3:'MP3', mp4:'MP4', wav:'WAV', avi:'AVI', mkv:'MKV', mov:'MOV',
    ttf:'TTF', woff:'WOFF', woff2:'WF2', eot:'EOT', otf:'OTF',
  };
  const col = colors[ext] || '#6B7280';
  const label = labels[ext] || ext.toUpperCase().slice(0, 4);
  return `<span class="file-ext-badge" style="background:${col}">${label}</span>`;
}

// ── Breadcrumbs ──
function sftpBreadcrumbs(path) {
  const parts = path.split('/').filter(Boolean);
  let html = `<span class="sftp-crumb" onclick="renderSFTPBrowser('/')" title="/">/</span>`;
  let acc = '';
  parts.forEach((part, i) => {
    acc += '/' + part;
    html += `<span class="sftp-crumb-sep">/</span>`;
    if (i === parts.length - 1) {
      html += `<span class="sftp-crumb sftp-crumb-active">${escapeHtml(part)}</span>`;
    } else {
      html += `<span class="sftp-crumb" onclick="renderSFTPBrowser('${escapeHtml(acc).replace(/'/g, "\\'")}')">${escapeHtml(part)}</span>`;
    }
  });
  return html;
}

// ── Context menu ──
function sftpContextMenu(e, entryIdx) {
  e.preventDefault();
  e.stopPropagation();
  sftpCloseContextMenu();
  const entry = _sftpEntries[entryIdx];
  if (!entry) return;
  const isDir = entry.type === 'directory';
  const fullPath = _sftpCurrentPath.replace(/\/$/, '') + '/' + entry.name;
  const ep = escapeHtml(fullPath).replace(/'/g, "\\'");

  let items = '';
  if (isDir) {
    items += `<div class="sftp-ctx-item" onclick="sftpCloseContextMenu(); renderSFTPBrowser('${ep}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> ${t('sftpOpen')}</div>`;
  } else {
    items += `<div class="sftp-ctx-item" onclick="sftpCloseContextMenu(); sftpOpenFile('${ep}', ${entry.size})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> ${t('sftpEdit')}</div>`;
    items += `<div class="sftp-ctx-item" onclick="sftpCloseContextMenu(); sftpDownload('${ep}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${t('sftpDownload')}</div>`;
  }
  items += `<div class="sftp-ctx-item" onclick="sftpCloseContextMenu(); sftpCopyPath('${ep}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> ${t('sftpCopyPath')}</div>`;
  if (_sftpCanWrite) {
    items += `<div class="sftp-ctx-sep"></div>`;
    items += `<div class="sftp-ctx-item" onclick="sftpCloseContextMenu(); sftpRename('${ep}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> ${t('sftpRename')}</div>`;
    items += `<div class="sftp-ctx-item" onclick="sftpCloseContextMenu(); sftpChmod('${ep}', '${entry.mode || '644'}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ${t('sftpChmod')}</div>`;
    items += `<div class="sftp-ctx-item" onclick="sftpCloseContextMenu(); sftpCompress('${ep}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 4v16"/></svg> ${t('sftpCompress')}</div>`;
    if (/\.(zip|tar\.gz|tgz|tar\.bz2|tar)$/i.test(entry.name) && !isDir) {
      items += `<div class="sftp-ctx-item" onclick="sftpCloseContextMenu(); sftpExtract('${ep}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> ${t('sftpExtract')}</div>`;
    }
    items += `<div class="sftp-ctx-sep"></div>`;
    items += `<div class="sftp-ctx-item sftp-ctx-danger" onclick="sftpCloseContextMenu(); sftpDelete('${ep}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> ${t('sftpDelete')}</div>`;
  }

  const menu = document.createElement('div');
  menu.id = 'sftpContextMenu';
  menu.className = 'sftp-ctx-menu';
  menu.innerHTML = items;
  document.body.appendChild(menu);
  // Position after append so we can measure
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let x = e.clientX, y = e.clientY;
  if (x + mw > window.innerWidth) x = window.innerWidth - mw - 5;
  if (y + mh > window.innerHeight) y = window.innerHeight - mh - 5;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  setTimeout(() => document.addEventListener('click', sftpCloseContextMenu, { once: true }), 10);
}

function sftpCloseContextMenu() {
  const m = document.getElementById('sftpContextMenu');
  if (m) m.remove();
}

// ── Copy path to clipboard ──
function sftpCopyPath(path) {
  navigator.clipboard.writeText(path).then(() => {
    const toast = document.createElement('div');
    toast.className = 'sftp-toast';
    toast.textContent = t('sftpPathCopied');
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('sftp-toast-show'), 10);
    setTimeout(() => { toast.classList.remove('sftp-toast-show'); setTimeout(() => toast.remove(), 300); }, 2000);
  });
}

// ── Sort ──
function sftpSort(field) {
  if (_sftpSortField === field) {
    _sftpSortDir = _sftpSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _sftpSortField = field;
    _sftpSortDir = 'asc';
  }
  sftpRenderFilteredRows();
}

// ── Filter + Search + Sort entries ──
function sftpGetFilteredEntries() {
  let entries = [..._sftpEntries];
  if (!_sftpShowHidden) entries = entries.filter(e => !e.name.startsWith('.'));
  if (_sftpSearchQuery) {
    const q = _sftpSearchQuery.toLowerCase();
    entries = entries.filter(e => e.name.toLowerCase().includes(q));
  }
  entries.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    let cmp = 0;
    switch (_sftpSortField) {
      case 'name': cmp = a.name.localeCompare(b.name); break;
      case 'size': cmp = (a.size || 0) - (b.size || 0); break;
      case 'modified': cmp = (a.modifyTime || 0) - (b.modifyTime || 0); break;
      case 'perms': cmp = (a.mode || '').localeCompare(b.mode || ''); break;
      default: cmp = a.name.localeCompare(b.name);
    }
    return _sftpSortDir === 'asc' ? cmp : -cmp;
  });
  return entries;
}

function sftpRenderFilteredRows() {
  const tbody = document.querySelector('#sftpTable tbody');
  if (!tbody) return;
  const entries = sftpGetFilteredEntries();
  tbody.innerHTML = entries.length === 0
    ? `<tr><td colspan="${_sftpCanWrite ? 7 : 6}" class="text-muted">${t('sftpNoFiles')}</td></tr>`
    : entries.map(e => renderSFTPRow(e, _sftpCanWrite)).join('');
  sftpUpdateStatusBar(entries);
  _sftpSelected.clear();
  sftpUpdateBulkBar();
  const sa = document.getElementById('sftpSelectAll');
  if (sa) sa.checked = false;
  // Update sort header indicators
  document.querySelectorAll('.sftp-sort-hdr').forEach(th => {
    th.classList.remove('sftp-sort-asc', 'sftp-sort-desc');
    if (th.dataset.sort === _sftpSortField) th.classList.add(_sftpSortDir === 'asc' ? 'sftp-sort-asc' : 'sftp-sort-desc');
  });
}

function sftpUpdateStatusBar(entries) {
  const bar = document.getElementById('sftpStatusBar');
  if (!bar) return;
  const files = entries.filter(e => e.type !== 'directory');
  const dirs = entries.length - files.length;
  const totalSize = files.reduce((sum, e) => sum + (e.size || 0), 0);
  const sel = _sftpSelected.size;
  bar.innerHTML = `<span>${dirs} ${dirs === 1 ? 'folder' : 'folders'}, ${files.length} ${files.length === 1 ? 'file' : 'files'}</span>` +
    `<span>${t('sftpTotalSize')}: ${formatBytes(totalSize)}</span>` +
    (sel > 0 ? `<span class="sftp-status-sel">${sel} ${t('sftpSelected')}</span>` : '');
}

// ── Toggle hidden files ──
function sftpToggleHidden() {
  _sftpShowHidden = !_sftpShowHidden;
  localStorage.setItem('sftp-show-hidden', _sftpShowHidden);
  const btn = document.getElementById('sftpHiddenBtn');
  if (btn) btn.classList.toggle('active', _sftpShowHidden);
  sftpRenderFilteredRows();
}

// ── Keyboard shortcuts ──
function sftpKeyHandler(e) {
  // Only when FTP panel is visible
  if (!document.getElementById('ftpPanel') && !document.getElementById('ftpFileList')) return;
  // Don't intercept if typing in input/textarea
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === 'Escape') e.target.blur();
    return;
  }
  if (e.key === 'F2' && _sftpSelected.size === 1) {
    e.preventDefault();
    sftpRename([..._sftpSelected][0]);
  } else if (e.key === 'Delete' && _sftpSelected.size > 0) {
    e.preventDefault();
    if (_sftpSelected.size === 1) sftpDelete([..._sftpSelected][0]);
    else sftpBulkDelete();
  } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
    const cbs = document.querySelectorAll('.sftp-row-cb');
    if (cbs.length > 0) { e.preventDefault(); sftpToggleAll(true); const sa = document.getElementById('sftpSelectAll'); if (sa) sa.checked = true; }
  } else if (e.key === 'Escape') {
    sftpCloseContextMenu();
    if (_sftpSelected.size > 0) { sftpToggleAll(false); const sa = document.getElementById('sftpSelectAll'); if (sa) sa.checked = false; }
  }
}

async function renderSFTPBrowser(path) {
  _sftpSelected.clear();
  _sftpSearchQuery = '';
  const container = document.getElementById('ftpFileList') || document.getElementById('detailContent');
  const targetPath = path || _sftpCurrentPath || '/';
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/list?path=${encodeURIComponent(targetPath)}`);
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    const data = await res.json();
    _sftpCurrentPath = data.path;
    _sftpEntries = data.entries;

    const server = window._lastWhmData?.servers?.find((s) => s.id === currentDetailServerId);
    _sftpCanWrite = server?.accessLevel === 'readwrite';
    const canWrite = _sftpCanWrite;

    const sortIcon = (field) => `<span class="sftp-sort-arrow">${_sftpSortField === field ? (_sftpSortDir === 'asc' ? '&#9650;' : '&#9660;') : ''}</span>`;

    const filtered = sftpGetFilteredEntries();

    container.innerHTML = `
      <div class="sftp-toolbar">
        <div class="sftp-path-bar">
          <button class="btn btn-lang btn-sm" onclick="sftpNavigateUp()" title="${t('sftpParentDir')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="sftp-breadcrumbs" id="sftpBreadcrumbs">${sftpBreadcrumbs(_sftpCurrentPath)}</div>
          <input type="text" class="sftp-path-input sftp-path-edit hidden" id="sftpPathInput" value="${escapeHtml(_sftpCurrentPath)}"
            onkeydown="if(event.key==='Enter'){sftpNavigateTo(this.value);} if(event.key==='Escape'){this.classList.add('hidden'); document.getElementById('sftpBreadcrumbs').classList.remove('hidden');}"
            onblur="this.classList.add('hidden'); document.getElementById('sftpBreadcrumbs').classList.remove('hidden');">
        </div>
        <div class="sftp-actions">
          <input type="text" class="sftp-search-input" id="sftpSearchInput" placeholder="${t('sftpSearch')}"
            oninput="_sftpSearchQuery=this.value; sftpRenderFilteredRows()">
          <button class="btn btn-lang btn-sm ${_sftpShowHidden ? 'active' : ''}" id="sftpHiddenBtn" onclick="sftpToggleHidden()" title="${t('sftpShowHidden')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn btn-refresh btn-sm" onclick="renderSFTPBrowser()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          ${canWrite ? `
            <button class="btn btn-refresh btn-sm" onclick="sftpNewFolder()" title="${t('sftpNewFolder')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="btn btn-refresh btn-sm" onclick="sftpNewFile()" title="${t('sftpNewFile')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </button>
            ${window.showDirectoryPicker ? `<button class="btn btn-refresh btn-sm sftp-sync-btn" onclick="syncStartMode()" title="${t('syncButton')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              ${t('syncButton')}
            </button>` : ''}
            <label class="btn btn-refresh btn-sm sftp-upload-btn" title="${t('sftpUpload')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
              <input type="file" multiple hidden onchange="sftpUploadFiles(this.files)">
            </label>
          ` : ''}
        </div>
      </div>
      <div class="sftp-upload-progress hidden" id="sftpUploadProgress">
        <div class="sftp-upload-info"><span id="sftpUploadName"></span><span id="sftpUploadPct">0%</span></div>
        <div class="sftp-upload-bar"><div class="sftp-upload-fill" id="sftpUploadFill"></div></div>
      </div>
      <div class="sftp-drop-zone ${canWrite ? '' : 'hidden'}" id="sftpDropZone">
        <p>${t('sftpDropHint')}</p>
      </div>
      ${canWrite ? `<div class="sftp-bulk-bar hidden" id="sftpBulkBar">
        <span class="sftp-bulk-count" id="sftpBulkCount">0 ${t('sftpSelected')}</span>
        <button class="btn btn-refresh btn-sm" onclick="sftpBulkCopy()">${t('sftpCopyTo')}</button>
        <button class="btn btn-refresh btn-sm" onclick="sftpBulkMove()">${t('sftpMoveTo')}</button>
        <button class="btn btn-refresh btn-sm" onclick="sftpBulkCompress()">${t('sftpCompressSelected')}</button>
        <button class="btn btn-danger-outline btn-sm" onclick="sftpBulkDelete()">${t('sftpDeleteSelected')}</button>
      </div>` : ''}
      <div class="table-wrapper">
        <table class="accounts-table sftp-table" id="sftpTable">
          <thead>
            <tr>
              ${canWrite ? `<th class="sftp-cb-col"><input type="checkbox" id="sftpSelectAll" onchange="sftpToggleAll(this.checked)" title="${t('sftpSelectAll')}"></th>` : ''}
              <th></th>
              <th class="sftp-sort-hdr ${_sftpSortField==='name'?(_sftpSortDir==='asc'?'sftp-sort-asc':'sftp-sort-desc'):''}" data-sort="name" onclick="sftpSort('name')">${t('sftpName')} ${sortIcon('name')}</th>
              <th class="sftp-sort-hdr ${_sftpSortField==='size'?(_sftpSortDir==='asc'?'sftp-sort-asc':'sftp-sort-desc'):''}" data-sort="size" onclick="sftpSort('size')">${t('sftpSize')} ${sortIcon('size')}</th>
              <th class="sftp-sort-hdr ${_sftpSortField==='perms'?(_sftpSortDir==='asc'?'sftp-sort-asc':'sftp-sort-desc'):''}" data-sort="perms" onclick="sftpSort('perms')">${t('sftpPermissions')} ${sortIcon('perms')}</th>
              <th class="sftp-sort-hdr ${_sftpSortField==='modified'?(_sftpSortDir==='asc'?'sftp-sort-asc':'sftp-sort-desc'):''}" data-sort="modified" onclick="sftpSort('modified')">${t('sftpModified')} ${sortIcon('modified')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `<tr><td colspan="${canWrite ? 7 : 6}" class="text-muted">${t('sftpNoFiles')}</td></tr>` :
              filtered.map((entry) => renderSFTPRow(entry, canWrite)).join('')
            }
          </tbody>
        </table>
      </div>
      <div class="sftp-status-bar" id="sftpStatusBar"></div>`;

    sftpUpdateStatusBar(filtered);

    // Breadcrumb click to edit path
    const bc = document.getElementById('sftpBreadcrumbs');
    const pi = document.getElementById('sftpPathInput');
    if (bc && pi) {
      bc.addEventListener('dblclick', () => {
        bc.classList.add('hidden');
        pi.classList.remove('hidden');
        pi.value = _sftpCurrentPath;
        pi.focus();
        pi.select();
      });
    }

    if (canWrite) setupSFTPDragDrop();
    // Attach keyboard handler
    document.removeEventListener('keydown', sftpKeyHandler);
    document.addEventListener('keydown', sftpKeyHandler);
  } catch (err) {
    container.innerHTML = `<div class="error"><p>${t('errorPrefix')}${err.message}</p></div>`;
  }
}

function renderSFTPRow(entry, canWrite) {
  const isDir = entry.type === 'directory';
  const icon = isDir
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
    : sftpFileIcon(entry.name);

  const fullPath = _sftpCurrentPath.replace(/\/$/, '') + '/' + entry.name;
  const ep = escapeHtml(fullPath).replace(/'/g, "\\'");
  const clickAction = isDir
    ? `onclick="renderSFTPBrowser('${ep}')"`
    : `onclick="sftpOpenFile('${ep}', ${entry.size})"`;

  // Find entry index in _sftpEntries for context menu
  const entryIdx = _sftpEntries.indexOf(entry);

  const sz = isDir ? '--' : formatBytes(entry.size);
  const permsText = entry.permissions || '--';
  const permsNum = entry.mode || '--';
  const modified = entry.modifyTime ? formatDateShort(new Date(entry.modifyTime * 1000).toISOString()) : '--';

  const cbCol = canWrite ? `<td class="sftp-cb-col"><input type="checkbox" class="sftp-row-cb" data-path="${escapeHtml(fullPath)}" onclick="event.stopPropagation(); sftpToggleSelect(this)" ${_sftpSelected.has(fullPath) ? 'checked' : ''}></td>` : '';

  return `
    <tr class="sftp-row" ${clickAction} oncontextmenu="sftpContextMenu(event, ${entryIdx})" style="cursor:pointer">
      ${cbCol}
      <td class="sftp-icon">${icon}</td>
      <td class="sftp-name"><strong>${escapeHtml(entry.name)}</strong></td>
      <td>${sz}</td>
      <td class="sftp-perms"><code title="${permsText}">${permsNum}</code></td>
      <td>${modified}</td>
      <td class="sftp-dots-cell"><button class="sftp-dots-btn" onclick="event.stopPropagation(); sftpContextMenu(event, ${entryIdx})" title="Actions">&#8942;</button></td>
    </tr>`;
}

// ── Multi-select bulk actions ──
function sftpToggleSelect(cb) {
  if (cb.checked) _sftpSelected.add(cb.dataset.path);
  else _sftpSelected.delete(cb.dataset.path);
  sftpUpdateBulkBar();
}

function sftpToggleAll(checked) {
  document.querySelectorAll('.sftp-row-cb').forEach((cb) => {
    cb.checked = checked;
    if (checked) _sftpSelected.add(cb.dataset.path);
    else _sftpSelected.delete(cb.dataset.path);
  });
  sftpUpdateBulkBar();
}

function sftpUpdateBulkBar() {
  const bar = document.getElementById('sftpBulkBar');
  const count = document.getElementById('sftpBulkCount');
  // Update status bar selected count
  const statusSel = document.getElementById('sftpStatusBar');
  if (statusSel) sftpUpdateStatusBar(sftpGetFilteredEntries());
  if (!bar) return;
  if (_sftpSelected.size > 0) {
    bar.classList.remove('hidden');
    count.textContent = `${_sftpSelected.size} ${t('sftpSelected')}`;
  } else {
    bar.classList.add('hidden');
  }
}

function sftpBulkDelete() {
  const paths = [..._sftpSelected];
  sftpDialog(t('sftpDeleteSelected'),
    `<p>${t('sftpConfirmDelete')} <strong>${paths.length}</strong> ${t('sftpSelected')}?</p>`,
    async () => {
      for (const p of paths) {
        try {
          await fetch(`/api/ssh/${currentDetailServerId}/sftp/delete?path=${encodeURIComponent(p)}`, { method: 'DELETE' });
        } catch {}
      }
      renderSFTPBrowser();
    }, t('sftpDelete'));
}

function sftpBulkCompress() {
  const paths = [..._sftpSelected];
  sftpDialog(t('sftpCompressSelected'),
    `<div class="form-group"><label>${t('sftpArchiveName')}</label>
     <input type="text" id="sftpDialogInput" value="archive.tar.gz" class="sftp-path-input"></div>
     <p class="text-muted" style="font-size:0.8rem">${paths.length} ${t('sftpSelected')}</p>`,
    async () => {
      const name = document.getElementById('sftpDialogInput').value.trim();
      if (!name) return;
      const destPath = _sftpCurrentPath.replace(/\/$/, '') + '/' + name;
      try {
        const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/compress`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths, destPath }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        renderSFTPBrowser();
      } catch (err) { alert(err.message); }
    }, t('sftpCompress'));
}

function sftpBulkMove() {
  const paths = [..._sftpSelected];
  sftpDialog(t('sftpMoveTitle'),
    `<div class="form-group"><label>${t('sftpDestination')}</label>
     <input type="text" id="sftpDialogInput" value="${escapeHtml(_sftpCurrentPath)}" class="sftp-path-input"></div>
     <p class="text-muted" style="font-size:0.8rem">${paths.length} ${t('sftpSelected')}</p>`,
    async () => {
      const dest = document.getElementById('sftpDialogInput').value.trim().replace(/\/$/, '');
      if (!dest) return;
      for (const p of paths) {
        const name = p.split('/').pop();
        const newPath = dest + '/' + name;
        try {
          await fetch(`/api/ssh/${currentDetailServerId}/sftp/rename`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPath: p, newPath }),
          });
        } catch {}
      }
      renderSFTPBrowser();
    }, t('sftpApply'));
}

function sftpBulkCopy() {
  const paths = [..._sftpSelected];
  sftpDialog(t('sftpCopyTitle'),
    `<div class="form-group"><label>${t('sftpDestination')}</label>
     <input type="text" id="sftpDialogInput" value="${escapeHtml(_sftpCurrentPath)}" class="sftp-path-input"></div>
     <p class="text-muted" style="font-size:0.8rem">${paths.length} ${t('sftpSelected')}</p>`,
    async () => {
      const dest = document.getElementById('sftpDialogInput').value.trim().replace(/\/$/, '');
      if (!dest) return;
      try {
        const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/copy`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths, destDir: dest }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        renderSFTPBrowser();
      } catch (err) { alert(err.message); }
    }, t('sftpApply'));
}

function sftpNavigateUp() {
  const parts = _sftpCurrentPath.split('/').filter(Boolean);
  parts.pop();
  renderSFTPBrowser('/' + parts.join('/'));
}

function sftpNavigateTo(path) {
  renderSFTPBrowser(path);
}

async function sftpDownload(path) {
  const url = `/api/ssh/${currentDetailServerId}/sftp/download?path=${encodeURIComponent(path)}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = path.split('/').pop();
  a.click();
}

// ── SFTP Custom Dialog ──
function sftpDialog(title, body, onConfirm, confirmLabel) {
  const existing = document.getElementById('sftpDialog');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'sftpDialog';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content sftp-dialog">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" id="sftpDialogClose">&times;</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">
        <button class="btn btn-lang" id="sftpDialogCancel">${t('sftpCancel')}</button>
        <button class="btn btn-refresh" id="sftpDialogOk">${confirmLabel || t('sftpApply')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#sftpDialogClose').onclick = close;
  overlay.querySelector('#sftpDialogCancel').onclick = close;
  overlay.querySelector('#sftpDialogOk').onclick = () => { onConfirm(); close(); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const firstInput = overlay.querySelector('input, textarea');
  if (firstInput) { firstInput.focus(); firstInput.select(); }
  // Enter key submits
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); overlay.querySelector('#sftpDialogOk').click(); }
    if (e.key === 'Escape') close();
  });
}

async function sftpDelete(path) {
  const name = path.split('/').pop();
  sftpDialog(t('sftpDelete'),
    `<p>${t('sftpConfirmDelete')} "<strong>${escapeHtml(name)}</strong>"?</p>`,
    async () => {
      try {
        const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        renderSFTPBrowser();
      } catch (err) { alert(err.message); }
    }, t('sftpDelete'));
}

function sftpRename(path) {
  const oldName = path.split('/').pop();
  sftpDialog(t('sftpNewNameTitle'),
    `<div class="form-group"><label>${t('sftpEnterName')}</label>
     <input type="text" id="sftpDialogInput" value="${escapeHtml(oldName)}" class="sftp-path-input"></div>`,
    async () => {
      const newName = document.getElementById('sftpDialogInput').value.trim();
      if (!newName || newName === oldName) return;
      const newPath = _sftpCurrentPath.replace(/\/$/, '') + '/' + newName;
      try {
        const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/rename`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath: path, newPath }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        renderSFTPBrowser();
      } catch (err) { alert(err.message); }
    }, t('sftpApply'));
}

function sftpNewFolder() {
  sftpDialog(t('sftpNewFolderTitle'),
    `<div class="form-group"><label>${t('sftpEnterName')}</label>
     <input type="text" id="sftpDialogInput" value="" placeholder="${t('sftpNewFolder')}" class="sftp-path-input"></div>`,
    async () => {
      const name = document.getElementById('sftpDialogInput').value.trim();
      if (!name) return;
      const path = _sftpCurrentPath.replace(/\/$/, '') + '/' + name;
      try {
        const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/mkdir`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        renderSFTPBrowser();
      } catch (err) { alert(err.message); }
    }, t('sftpApply'));
}

function sftpNewFile() {
  sftpDialog(t('sftpNewFileTitle'),
    `<div class="form-group"><label>${t('sftpEnterName')}</label>
     <input type="text" id="sftpDialogInput" value="" placeholder="file.txt" class="sftp-path-input"></div>`,
    async () => {
      const name = document.getElementById('sftpDialogInput').value.trim();
      if (!name) return;
      const path = _sftpCurrentPath.replace(/\/$/, '') + '/' + name;
      try {
        const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/mkfile`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        renderSFTPBrowser();
      } catch (err) { alert(err.message); }
    }, t('sftpApply'));
}

function sftpChmod(path, currentPerms) {
  // Parse octal from string like "0755" or "755"
  const octal = currentPerms.replace(/^0/, '') || '644';
  const o = parseInt(octal, 10);
  const owner = Math.floor(o / 100) % 10;
  const group = Math.floor(o / 10) % 10;
  const others = o % 10;

  const checkboxRow = (label, val) => `
    <tr>
      <td><strong>${label}</strong></td>
      <td><label class="sftp-chmod-cb"><input type="checkbox" data-bit="4" ${val & 4 ? 'checked' : ''}> ${t('sftpRead')}</label></td>
      <td><label class="sftp-chmod-cb"><input type="checkbox" data-bit="2" ${val & 2 ? 'checked' : ''}> ${t('sftpWrite')}</label></td>
      <td><label class="sftp-chmod-cb"><input type="checkbox" data-bit="1" ${val & 1 ? 'checked' : ''}> ${t('sftpExecute')}</label></td>
    </tr>`;

  const body = `
    <div class="sftp-chmod-panel">
      <div class="form-group">
        <label>${t('sftpChmodTitle')}: <strong>${escapeHtml(path.split('/').pop())}</strong></label>
        <input type="text" id="sftpChmodInput" value="${octal}" maxlength="4" class="sftp-path-input sftp-chmod-input">
      </div>
      <table class="sftp-chmod-table">
        <thead><tr><th></th><th>${t('sftpRead')}</th><th>${t('sftpWrite')}</th><th>${t('sftpExecute')}</th></tr></thead>
        <tbody id="sftpChmodBody">
          ${checkboxRow(t('sftpOwner'), owner)}
          ${checkboxRow(t('sftpGroup'), group)}
          ${checkboxRow(t('sftpOthers'), others)}
        </tbody>
      </table>
    </div>`;

  sftpDialog(t('sftpChmodTitle'), body, async () => {
    const mode = document.getElementById('sftpChmodInput').value.trim();
    if (!/^[0-7]{3,4}$/.test(mode)) { alert('Invalid permissions (e.g. 755)'); return; }
    try {
      const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/chmod`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, mode }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      renderSFTPBrowser();
    } catch (err) { alert(err.message); }
  }, t('sftpApply'));

  // Sync checkboxes ↔ input
  setTimeout(() => {
    const input = document.getElementById('sftpChmodInput');
    const body = document.getElementById('sftpChmodBody');
    if (!input || !body) return;

    const syncFromCheckboxes = () => {
      const rows = body.querySelectorAll('tr');
      let val = '';
      rows.forEach((row) => {
        let n = 0;
        row.querySelectorAll('input[type=checkbox]').forEach((cb) => {
          if (cb.checked) n += parseInt(cb.dataset.bit);
        });
        val += n;
      });
      input.value = val;
    };

    const syncFromInput = () => {
      const v = input.value.replace(/^0/, '');
      if (!/^[0-7]{3}$/.test(v)) return;
      const rows = body.querySelectorAll('tr');
      [0, 1, 2].forEach((i) => {
        const n = parseInt(v[i]);
        const cbs = rows[i].querySelectorAll('input[type=checkbox]');
        cbs.forEach((cb) => { cb.checked = !!(n & parseInt(cb.dataset.bit)); });
      });
    };

    body.addEventListener('change', syncFromCheckboxes);
    input.addEventListener('input', syncFromInput);
  }, 50);
}

async function sftpUploadFiles(fileList) {
  const progWrap = document.getElementById('sftpUploadProgress');
  const progName = document.getElementById('sftpUploadName');
  const progPct = document.getElementById('sftpUploadPct');
  const progFill = document.getElementById('sftpUploadFill');

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const formData = new FormData();
    formData.append('file', file);

    if (progWrap) {
      progWrap.classList.remove('hidden');
      if (progName) progName.textContent = `${file.name} (${i + 1}/${fileList.length})`;
      if (progPct) progPct.textContent = '0%';
      if (progFill) progFill.style.width = '0%';
    }

    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/ssh/${currentDetailServerId}/sftp/upload?destPath=${encodeURIComponent(_sftpCurrentPath)}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            if (progPct) progPct.textContent = `${pct}%`;
            if (progFill) progFill.style.width = `${pct}%`;
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try { reject(new Error(JSON.parse(xhr.responseText).error)); }
            catch { reject(new Error(`HTTP ${xhr.status}`)); }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
    } catch (err) {
      alert(`Upload failed: ${file.name}: ${err.message}`);
    }
  }
  if (progWrap) progWrap.classList.add('hidden');
  renderSFTPBrowser();
}

function setupSFTPDragDrop() {
  const zone = document.getElementById('sftpDropZone');
  const table = document.getElementById('sftpTable');
  if (!zone || !table) return;

  ['dragenter', 'dragover'].forEach((ev) => {
    table.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('sftp-drop-active'); });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    zone.addEventListener(ev, () => { zone.classList.remove('sftp-drop-active'); });
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) sftpUploadFiles(e.dataTransfer.files);
  });
  zone.addEventListener('dragover', (e) => e.preventDefault());
}

function sftpCompress(path) {
  const name = path.split('/').pop();
  const defaultName = name + '.tar.gz';
  sftpDialog(t('sftpCompressTitle'),
    `<div class="form-group"><label>${t('sftpArchiveName')}</label>
     <input type="text" id="sftpDialogInput" value="${escapeHtml(defaultName)}" class="sftp-path-input"></div>`,
    async () => {
      const archiveName = document.getElementById('sftpDialogInput').value.trim();
      if (!archiveName) return;
      const destPath = _sftpCurrentPath.replace(/\/$/, '') + '/' + archiveName;
      try {
        const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/compress`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths: [path], destPath }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        renderSFTPBrowser();
      } catch (err) { alert(err.message); }
    }, t('sftpCompress'));
}

function sftpExtract(archivePath) {
  sftpDialog(t('sftpExtractTitle'),
    `<div class="form-group"><label>${t('sftpExtractTitle')}: <strong>${escapeHtml(archivePath.split('/').pop())}</strong></label>
     <input type="text" id="sftpDialogInput" value="${escapeHtml(_sftpCurrentPath)}" class="sftp-path-input" placeholder="/destination/path"></div>`,
    async () => {
      const destDir = document.getElementById('sftpDialogInput').value.trim();
      if (!destDir) return;
      try {
        const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/extract`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archivePath, destDir }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
        renderSFTPBrowser();
      } catch (err) { alert(err.message); }
    }, t('sftpExtract'));
}

function sftpOpenFile(path, size) {
  if (size > 2 * 1024 * 1024) {
    alert(t('editorFileTooLarge'));
    return;
  }
  if (_editorDirty && !confirm(t('editorUnsavedChanges'))) return;
  _editorFilePath = path;
  const panel = document.getElementById('ftpPanel');
  if (panel) panel.classList.add('split');
  renderEditorPanel();
}

// ── File Editor Component (renders inside FTP editor pane) ──
async function renderEditorPanel() {
  const pane = document.getElementById('ftpEditorPane');
  if (!pane || !_editorFilePath) return;
  const server = window._lastWhmData?.servers?.find((s) => s.id === currentDetailServerId);
  const canWrite = server?.accessLevel === 'readwrite';

  if (_cmEditor) { _cmEditor.toTextArea(); _cmEditor = null; }

  pane.innerHTML = `
    <div class="editor-toolbar">
      <span class="editor-filename">${escapeHtml(_editorFilePath)}</span>
      <span class="editor-status" id="editorStatus"></span>
      <div class="editor-actions">
        ${canWrite ? `<button class="btn btn-refresh btn-sm" id="editorSaveBtn" onclick="editorSave()" disabled>${t('editorSave')}</button>` : ''}
        <button class="btn btn-lang btn-sm" onclick="editorClose()">${t('editorClose')}</button>
      </div>
    </div>
    <div class="editor-container" id="editorContainer">
      <div class="loading"><div class="spinner"></div></div>
    </div>`;

  if (!canWrite) {
    const statusEl = document.getElementById('editorStatus');
    if (statusEl) statusEl.textContent = t('editorReadOnly');
  }

  try {
    const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/read?path=${encodeURIComponent(_editorFilePath)}`);
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    const data = await res.json();

    _editorOrigContent = data.content;
    _editorDirty = false;

    const container = document.getElementById('editorContainer');
    container.innerHTML = '<textarea id="editorTextarea"></textarea>';

    const mode = detectCodeMirrorMode(_editorFilePath);

    _cmEditor = CodeMirror.fromTextArea(document.getElementById('editorTextarea'), {
      value: data.content,
      mode: mode,
      theme: document.body.dataset.theme === 'light' ? 'default' : 'material-darker',
      lineNumbers: true,
      readOnly: !canWrite,
      tabSize: 2,
      indentWithTabs: false,
      lineWrapping: true,
      matchBrackets: true,
      extraKeys: {
        'Ctrl-S': () => editorSave(),
        'Cmd-S': () => editorSave(),
      },
    });

    _cmEditor.setValue(data.content);

    _cmEditor.on('change', () => {
      const dirty = _cmEditor.getValue() !== _editorOrigContent;
      _editorDirty = dirty;
      const saveBtn = document.getElementById('editorSaveBtn');
      if (saveBtn) saveBtn.disabled = !dirty;
    });

    // Refresh CodeMirror after CSS transition completes
    setTimeout(() => { if (_cmEditor) _cmEditor.refresh(); }, 300);
  } catch (err) {
    document.getElementById('editorContainer').innerHTML = `<div class="error"><p>${t('errorPrefix')}${err.message}</p></div>`;
  }
}

function detectCodeMirrorMode(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const modeMap = {
    js: 'javascript', json: 'application/json', jsx: 'jsx',
    php: 'php', py: 'python',
    html: 'htmlmixed', htm: 'htmlmixed',
    css: 'css', scss: 'css', less: 'css',
    xml: 'xml', svg: 'xml',
    sh: 'shell', bash: 'shell', zsh: 'shell',
    yaml: 'yaml', yml: 'yaml',
    conf: 'nginx', nginx: 'nginx',
    sql: 'sql', md: 'markdown',
    ini: 'properties', env: 'shell',
  };
  return modeMap[ext] || 'text/plain';
}

async function editorSave() {
  if (!_cmEditor || !_editorFilePath) return;
  const statusEl = document.getElementById('editorStatus');
  const saveBtn = document.getElementById('editorSaveBtn');

  statusEl.textContent = t('editorSaving');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/write`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: _editorFilePath, content: _cmEditor.getValue() }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }

    _editorOrigContent = _cmEditor.getValue();
    _editorDirty = false;
    statusEl.textContent = t('editorSaved');
    statusEl.className = 'editor-status text-success';
    setTimeout(() => {
      if (statusEl) { statusEl.textContent = ''; statusEl.className = 'editor-status'; }
    }, 3000);
  } catch (err) {
    statusEl.textContent = `${t('editorSaveFailed')}: ${err.message}`;
    statusEl.className = 'editor-status text-danger';
  }
  if (saveBtn) saveBtn.disabled = !_editorDirty;
}

function editorClose() {
  if (_editorDirty && !confirm(t('editorUnsavedChanges'))) return;
  _editorFilePath = null;
  _editorDirty = false;
  _editorOrigContent = '';
  if (_cmEditor) {
    _cmEditor.toTextArea();
    _cmEditor = null;
  }
  const panel = document.getElementById('ftpPanel');
  if (panel) panel.classList.remove('split');
  const pane = document.getElementById('ftpEditorPane');
  if (pane) pane.innerHTML = '';
}

// ══════════════════════════════════════════════
// ═══ FTP Sync Mode ═══
// ══════════════════════════════════════════════

async function syncStartMode() {
  if (!window.showDirectoryPicker) { alert(t('syncNotSupported')); return; }
  try {
    const dirHandle = await window.showDirectoryPicker();
    _syncActive = true;
    _syncLocalDirHandle = dirHandle;
    _syncLocalPath = dirHandle.name;
    _syncLocalCurrentPath = '';
    _syncServerCurrentPath = _sftpCurrentPath;
    _syncFilterChangedOnly = false;
    if (_editorDirty || _editorFilePath) editorClose();
    renderSyncPanel();
  } catch (e) {
    // User cancelled the picker
    if (e.name !== 'AbortError') console.error(e);
  }
}

async function renderSyncPanel() {
  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <div class="sync-panel" id="syncPanel">
      <div class="sync-toolbar">
        <div class="sync-toolbar-left">
          <button class="btn btn-lang btn-sm" onclick="syncClose()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ${t('syncClose')}
          </button>
          <span class="sync-local-name" title="${escapeHtml(_syncLocalPath)}">${escapeHtml(_syncLocalPath)}</span>
          <span class="sync-arrow">&#8596;</span>
          <span class="sync-server-name" title="${escapeHtml(_syncServerCurrentPath)}">${escapeHtml(_syncServerCurrentPath)}</span>
        </div>
        <div class="sync-toolbar-right">
          <button class="btn btn-refresh btn-sm" onclick="syncRefresh()" title="${t('syncRefresh')}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
          <label class="sync-filter-toggle">
            <input type="checkbox" id="syncFilterChanged" onchange="syncToggleFilter(this.checked)" ${_syncFilterChangedOnly ? 'checked' : ''}>
            <span>${t('syncFilterChanged')}</span>
          </label>
        </div>
      </div>
      <div class="sync-actions-bar" id="syncActionsBar">
        <div class="sync-actions-left">
          <input type="checkbox" id="syncSelectAllCb" onchange="syncToggleSelectAll(this.checked)" style="accent-color:var(--accent);width:15px;height:15px;cursor:pointer">
          <span class="sync-selection-count" id="syncSelectionCount">0 ${t('sftpSelected')}</span>
        </div>
        <div class="sync-actions-right">
          <button class="btn btn-refresh btn-sm" onclick="syncUploadAll()" id="syncUploadAllBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
            ${t('syncUploadAll')}
          </button>
          <button class="btn btn-refresh btn-sm" onclick="syncDownloadAll()" id="syncDownloadAllBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ${t('syncDownloadAll')}
          </button>
        </div>
      </div>
      <div class="sync-progress hidden" id="syncProgressBar">
        <div class="sync-progress-info"><span id="syncProgressFile"></span><span id="syncProgressPct">0%</span></div>
        <div class="sftp-upload-bar"><div class="sftp-upload-fill" id="syncProgressFill"></div></div>
      </div>
      <div class="sync-panes" id="syncPanes">
        <div class="sync-pane-header">
          <div class="sync-col-cb"></div>
          <div class="sync-col-icon"></div>
          <div class="sync-col-name">${t('sftpName')}</div>
          <div class="sync-col-local">${t('syncLocalFiles')}</div>
          <div class="sync-col-server">${t('syncServerFiles')}</div>
          <div class="sync-col-action"></div>
        </div>
        <div class="sync-pane-body" id="syncPaneBody">
          <div class="loading"><div class="spinner"></div><p>${t('syncComparing')}</p></div>
        </div>
      </div>
      <div class="sync-status-bar" id="syncStatusBar"></div>
    </div>`;
  await syncLoadAndCompare();
}

async function syncLoadAndCompare() {
  const body = document.getElementById('syncPaneBody');
  if (body) body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const [localEntries, serverData] = await Promise.all([
      syncReadLocalDirectory(),
      syncReadServerDirectory(_syncServerCurrentPath),
    ]);
    _syncLocalEntries = localEntries;
    _syncServerEntries = serverData;
    syncCompare();
    syncRenderRows();
  } catch (err) {
    if (body) body.innerHTML = `<div class="error"><p>${t('errorPrefix')}${err.message}</p></div>`;
  }
}

async function syncReadLocalDirectory() {
  const entries = [];
  try {
    let targetHandle = _syncLocalDirHandle;
    if (_syncLocalCurrentPath) {
      const segments = _syncLocalCurrentPath.split('/').filter(Boolean);
      for (const seg of segments) {
        targetHandle = await targetHandle.getDirectoryHandle(seg);
      }
    }
    for await (const [name, handle] of targetHandle) {
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        entries.push({ name, type: 'file', size: file.size, lastModified: file.lastModified, handle });
      } else {
        entries.push({ name, type: 'directory', size: 0, lastModified: 0, handle });
      }
    }
  } catch (e) {
    // Directory might not exist locally
  }
  return entries;
}

async function syncReadServerDirectory(path) {
  try {
    const res = await fetch(`/api/ssh/${currentDetailServerId}/sftp/list?path=${encodeURIComponent(path)}`);
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    const data = await res.json();
    return data.entries || [];
  } catch {
    return [];
  }
}

function syncCompare() {
  const localMap = new Map();
  const serverMap = new Map();
  for (const e of _syncLocalEntries) localMap.set(e.name, e);
  for (const e of _syncServerEntries) serverMap.set(e.name, e);
  const allNames = new Set([...localMap.keys(), ...serverMap.keys()]);
  const results = [];

  for (const name of allNames) {
    const local = localMap.get(name) || null;
    const server = serverMap.get(name) || null;
    let status;

    if (local && !server) {
      status = 'local_only';
    } else if (!local && server) {
      status = 'server_only';
    } else if (local.type === 'directory' && server.type === 'directory') {
      status = 'same';
    } else if (local.type === 'directory' || server.type === 'directory') {
      status = 'modified';
    } else {
      const lMod = Math.floor(local.lastModified / 1000);
      const sMod = server.modifyTime || 0;
      if (local.size === server.size && Math.abs(lMod - sMod) < 2) {
        status = 'same';
      } else if (lMod > sMod) {
        status = 'local_newer';
      } else if (sMod > lMod) {
        status = 'server_newer';
      } else {
        status = 'modified';
      }
    }

    results.push({ name, type: local?.type || server?.type, localEntry: local, serverEntry: server, status, selected: false });
  }

  results.sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
  _syncComparisonResults = results;
}

function syncRenderRows() {
  const body = document.getElementById('syncPaneBody');
  if (!body) return;

  let items = _syncComparisonResults;
  if (_syncFilterChangedOnly) items = items.filter(r => r.status !== 'same');

  if (items.length === 0 && _syncComparisonResults.length > 0) {
    body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-secondary)">${t('syncNoChanges')}</div>`;
  } else if (items.length === 0) {
    body.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-secondary)">${t('sftpNoFiles')}</div>`;
  } else {
    let html = '';
    // Parent row
    if (_syncLocalCurrentPath) {
      html += `<div class="sync-row sync-row-back" onclick="syncNavigateUp()" style="cursor:pointer">
        <div class="sync-col-cb"></div>
        <div class="sync-col-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></div>
        <div class="sync-col-name">..</div>
        <div class="sync-col-local"></div><div class="sync-col-server"></div><div class="sync-col-action"></div>
      </div>`;
    }
    items.forEach((r) => {
      const realIdx = _syncComparisonResults.indexOf(r);
      const isDir = r.type === 'directory';
      const icon = isDir
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        : sftpFileIcon(r.name);

      const statusLabels = {
        same: t('syncStatusSame'), modified: t('syncStatusModified'),
        local_only: t('syncStatusLocalOnly'), server_only: t('syncStatusServerOnly'),
        local_newer: t('syncStatusLocalNewer'), server_newer: t('syncStatusServerNewer'),
      };
      const statusClasses = {
        same: 'sync-status-same', modified: 'sync-status-modified',
        local_only: 'sync-status-local-only', server_only: 'sync-status-server-only',
        local_newer: 'sync-status-local-newer', server_newer: 'sync-status-server-newer',
      };

      const badge = `<span class="sync-status-badge ${statusClasses[r.status]}">${statusLabels[r.status]}</span>`;

      const localInfo = r.localEntry
        ? `<span class="sync-info-size">${isDir ? '--' : formatBytes(r.localEntry.size)}</span><span class="sync-info-date">${r.localEntry.lastModified ? formatDateShort(new Date(r.localEntry.lastModified).toISOString()) : ''}</span>`
        : '<span class="text-muted">--</span>';
      const serverInfo = r.serverEntry
        ? `<span class="sync-info-size">${isDir ? '--' : formatBytes(r.serverEntry.size)}</span><span class="sync-info-date">${r.serverEntry.modifyTime ? formatDateShort(new Date(r.serverEntry.modifyTime * 1000).toISOString()) : ''}</span>`
        : '<span class="text-muted">--</span>';

      let actionBtn = '';
      if (!isDir) {
        if (r.status === 'local_only' || r.status === 'local_newer' || r.status === 'modified') {
          actionBtn = `<button class="sync-action-btn sync-action-upload" onclick="event.stopPropagation(); syncUploadOne(${realIdx})" title="Upload">&#9650;</button>`;
        }
        if (r.status === 'server_only' || r.status === 'server_newer') {
          actionBtn = `<button class="sync-action-btn sync-action-download" onclick="event.stopPropagation(); syncDownloadOne(${realIdx})" title="Download">&#9660;</button>`;
        }
        if (r.status === 'modified') {
          actionBtn = `<button class="sync-action-btn sync-action-upload" onclick="event.stopPropagation(); syncUploadOne(${realIdx})" title="Upload">&#9650;</button>`;
        }
      }

      const clickAction = isDir ? `onclick="syncNavigateInto('${escapeHtml(r.name).replace(/'/g, "\\'")}')"` : '';

      html += `<div class="sync-row ${isDir ? 'sync-nav-row' : ''}" ${clickAction} style="${isDir ? 'cursor:pointer' : ''}">
        <div class="sync-col-cb">${!isDir ? `<input type="checkbox" class="sync-row-cb" data-idx="${realIdx}" onclick="event.stopPropagation(); syncToggleSelect(${realIdx}, this.checked)" ${r.selected ? 'checked' : ''}>` : ''}</div>
        <div class="sync-col-icon">${icon}</div>
        <div class="sync-col-name">${escapeHtml(r.name)}${isDir ? '/' : ''} ${badge}</div>
        <div class="sync-col-local">${localInfo}</div>
        <div class="sync-col-server">${serverInfo}</div>
        <div class="sync-col-action">${actionBtn}</div>
      </div>`;
    });
    body.innerHTML = html;
  }
  syncUpdateStatusBar();
  syncUpdateSelectionUI();
}

function syncUpdateStatusBar() {
  const bar = document.getElementById('syncStatusBar');
  if (!bar) return;
  const files = _syncComparisonResults.filter(r => r.type !== 'directory');
  const dirs = _syncComparisonResults.length - files.length;
  const changed = _syncComparisonResults.filter(r => r.status !== 'same').length;
  bar.innerHTML = `<span>${dirs} folders, ${files.length} files</span><span>${changed} changed</span>`;
}

function syncNavigateInto(name) {
  _syncLocalCurrentPath = (_syncLocalCurrentPath ? _syncLocalCurrentPath + '/' : '') + name;
  _syncServerCurrentPath = _syncServerCurrentPath.replace(/\/$/, '') + '/' + name;
  // Update header labels
  const sn = document.querySelector('.sync-server-name');
  if (sn) sn.textContent = _syncServerCurrentPath;
  syncLoadAndCompare();
}

function syncNavigateUp() {
  const lParts = _syncLocalCurrentPath.split('/').filter(Boolean);
  lParts.pop();
  _syncLocalCurrentPath = lParts.join('/');
  const sParts = _syncServerCurrentPath.split('/').filter(Boolean);
  sParts.pop();
  _syncServerCurrentPath = '/' + sParts.join('/');
  const sn = document.querySelector('.sync-server-name');
  if (sn) sn.textContent = _syncServerCurrentPath;
  syncLoadAndCompare();
}

function syncClose() {
  _syncActive = false;
  _syncLocalDirHandle = null;
  _syncLocalPath = '';
  _syncLocalEntries = [];
  _syncServerEntries = [];
  _syncLocalCurrentPath = '';
  _syncComparisonResults = [];
  _syncInProgress = false;
  renderFTPPanel();
}

function syncRefresh() { syncLoadAndCompare(); }

function syncToggleFilter(checked) {
  _syncFilterChangedOnly = checked;
  syncRenderRows();
}

function syncToggleSelectAll(checked) {
  _syncComparisonResults.forEach(r => { if (r.type !== 'directory') r.selected = checked; });
  document.querySelectorAll('.sync-row-cb').forEach(cb => { cb.checked = checked; });
  syncUpdateSelectionUI();
}

function syncToggleSelect(idx, checked) {
  _syncComparisonResults[idx].selected = checked;
  syncUpdateSelectionUI();
}

function syncUpdateSelectionUI() {
  const count = _syncComparisonResults.filter(r => r.selected).length;
  const el = document.getElementById('syncSelectionCount');
  if (el) el.textContent = `${count} ${t('sftpSelected')}`;
}

function syncShowProgress(file, pct) {
  const bar = document.getElementById('syncProgressBar');
  const fEl = document.getElementById('syncProgressFile');
  const pEl = document.getElementById('syncProgressPct');
  const fill = document.getElementById('syncProgressFill');
  if (bar) bar.classList.remove('hidden');
  if (fEl) fEl.textContent = file;
  if (pEl) pEl.textContent = `${pct}%`;
  if (fill) fill.style.width = `${pct}%`;
}

function syncHideProgress() {
  const bar = document.getElementById('syncProgressBar');
  if (bar) bar.classList.add('hidden');
}

async function syncUploadAll() {
  const items = _syncComparisonResults.filter(r => r.type !== 'directory' && ['local_only', 'local_newer', 'modified'].includes(r.status));
  if (items.length === 0) return;
  await syncExecuteUpload(items);
}

async function syncDownloadAll() {
  const items = _syncComparisonResults.filter(r => r.type !== 'directory' && ['server_only', 'server_newer'].includes(r.status));
  if (items.length === 0) return;
  await syncExecuteDownload(items);
}

async function syncUploadOne(idx) {
  const r = _syncComparisonResults[idx];
  if (r) await syncExecuteUpload([r]);
}

async function syncDownloadOne(idx) {
  const r = _syncComparisonResults[idx];
  if (r) await syncExecuteDownload([r]);
}

async function syncExecuteUpload(items) {
  if (_syncInProgress) return;
  _syncInProgress = true;
  try {
    // Ensure server directory exists
    const serverDir = _syncServerCurrentPath;
    await fetch(`/api/ssh/${currentDetailServerId}/sftp/mkdirp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: serverDir }),
    });

    for (let i = 0; i < items.length; i++) {
      const r = items[i];
      syncShowProgress(`${r.name} (${i + 1}/${items.length})`, Math.round((i / items.length) * 100));
      // Get local file handle
      let dirHandle = _syncLocalDirHandle;
      if (_syncLocalCurrentPath) {
        for (const seg of _syncLocalCurrentPath.split('/').filter(Boolean)) {
          dirHandle = await dirHandle.getDirectoryHandle(seg);
        }
      }
      const fileHandle = await dirHandle.getFileHandle(r.name);
      const file = await fileHandle.getFile();
      const formData = new FormData();
      formData.append('file', file);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `/api/ssh/${currentDetailServerId}/sftp/upload?destPath=${encodeURIComponent(serverDir)}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const filePct = Math.round((e.loaded / e.total) * 100);
            const totalPct = Math.round(((i + filePct / 100) / items.length) * 100);
            syncShowProgress(`${r.name} (${i + 1}/${items.length})`, totalPct);
          }
        };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });
    }
    syncShowProgress(t('syncComplete'), 100);
    setTimeout(() => { syncHideProgress(); syncRefresh(); }, 1000);
  } catch (err) {
    alert(`${t('syncFailed')}: ${err.message}`);
    syncHideProgress();
  }
  _syncInProgress = false;
}

async function syncExecuteDownload(items) {
  if (_syncInProgress) return;
  _syncInProgress = true;
  try {
    let dirHandle = _syncLocalDirHandle;
    if (_syncLocalCurrentPath) {
      for (const seg of _syncLocalCurrentPath.split('/').filter(Boolean)) {
        dirHandle = await dirHandle.getDirectoryHandle(seg, { create: true });
      }
    }

    for (let i = 0; i < items.length; i++) {
      const r = items[i];
      syncShowProgress(`${r.name} (${i + 1}/${items.length})`, Math.round((i / items.length) * 100));
      const serverPath = _syncServerCurrentPath.replace(/\/$/, '') + '/' + r.name;
      const resp = await fetch(`/api/ssh/${currentDetailServerId}/sftp/download?path=${encodeURIComponent(serverPath)}`);
      if (!resp.ok) throw new Error(`Failed to download ${r.name}`);
      const blob = await resp.blob();
      const fileHandle = await dirHandle.getFileHandle(r.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      syncShowProgress(`${r.name} (${i + 1}/${items.length})`, Math.round(((i + 1) / items.length) * 100));
    }
    syncShowProgress(t('syncComplete'), 100);
    setTimeout(() => { syncHideProgress(); syncRefresh(); }, 1000);
  } catch (err) {
    alert(`${t('syncFailed')}: ${err.message}`);
    syncHideProgress();
  }
  _syncInProgress = false;
}

// ══════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════

const SERVER_TYPE_FIELDS = {
  cpanel: [
    { key: 'name', label: 'settServerName', type: 'text', required: true },
    { key: 'host', label: 'settServerHost', type: 'text', required: true },
    { key: 'port', label: 'settServerPort', type: 'number', default: 2087 },
    { key: 'user', label: 'settServerUser', type: 'text', default: 'root' },
    { key: 'token', label: 'settServerToken', type: 'password', required: true, sensitive: true },
    { key: 'diskTotalGB', label: 'settServerDiskGB', type: 'number', default: 0 },
    // Optional SSH access
    { key: 'sshHost', label: 'sshHostLabel', type: 'text', group: 'ssh', placeholder: 'sshHostPlaceholder' },
    { key: 'sshPort', label: 'settServerPort', type: 'number', default: 22, group: 'ssh' },
    { key: 'sshUsername', label: 'settServerUser', type: 'text', group: 'ssh' },
    { key: 'sshAuthType', label: 'settServerAuthType', type: 'select', options: ['password', 'key'], group: 'ssh' },
    { key: 'sshPassword', label: 'settServerPassword', type: 'password', sensitive: true, group: 'ssh' },
    { key: 'sshPrivateKey', label: 'settServerPrivateKey', type: 'textarea', sensitive: true, group: 'ssh' },
    { key: 'sshPassphrase', label: 'sshPassphraseLabel', type: 'password', sensitive: true, group: 'ssh' },
  ],
  ssh: [
    { key: 'name', label: 'settServerName', type: 'text', required: true },
    { key: 'host', label: 'settServerHost', type: 'text', required: true },
    { key: 'port', label: 'settServerPort', type: 'number', default: 22 },
    { key: 'username', label: 'settServerUser', type: 'text', required: true },
    { key: 'authType', label: 'settServerAuthType', type: 'select', options: ['password', 'key'], required: true },
    { key: 'password', label: 'settServerPassword', type: 'password', sensitive: true },
    { key: 'privateKey', label: 'settServerPrivateKey', type: 'textarea', sensitive: true },
    { key: 'passphrase', label: 'sshPassphraseLabel', type: 'password', sensitive: true },
  ],
  plesk: [
    { key: 'name', label: 'settServerName', type: 'text', required: true },
    { key: 'host', label: 'settServerHost', type: 'text', required: true },
    { key: 'port', label: 'settServerPort', type: 'number', default: 8443 },
    { key: 'apiKey', label: 'settServerApiKey', type: 'password', required: true, sensitive: true },
  ],
  directadmin: [
    { key: 'name', label: 'settServerName', type: 'text', required: true },
    { key: 'host', label: 'settServerHost', type: 'text', required: true },
    { key: 'port', label: 'settServerPort', type: 'number', default: 2222 },
    { key: 'username', label: 'settServerUser', type: 'text', required: true },
    { key: 'password', label: 'settServerPassword', type: 'password', required: true, sensitive: true },
  ],
  cyberpanel: [
    { key: 'name', label: 'settServerName', type: 'text', required: true },
    { key: 'host', label: 'settServerHost', type: 'text', required: true },
    { key: 'port', label: 'settServerPort', type: 'number', default: 8090 },
    { key: 'apiKey', label: 'settServerApiKey', type: 'password', required: true, sensitive: true },
  ],
  hestiacp: [
    { key: 'name', label: 'settServerName', type: 'text', required: true },
    { key: 'host', label: 'settServerHost', type: 'text', required: true },
    { key: 'port', label: 'settServerPort', type: 'number', default: 8083 },
    { key: 'username', label: 'settServerUser', type: 'text', required: true },
    { key: 'password', label: 'settServerPassword', type: 'password', required: true, sensitive: true },
  ],
  proxmox: [
    { key: 'name', label: 'settServerName', type: 'text', required: true },
    { key: 'host', label: 'settServerHost', type: 'text', required: true },
    { key: 'port', label: 'settServerPort', type: 'number', default: 8006 },
    { key: 'username', label: 'settServerUser', type: 'text', required: true },
    { key: 'password', label: 'settServerPassword', type: 'password', required: true, sensitive: true },
    { key: 'realm', label: 'settServerRealm', type: 'text', default: 'pam' },
  ],
  uptime: [
    { key: 'name', label: 'settServerName', type: 'text', required: true },
    { key: 'url', label: 'settServerUrl', type: 'text', required: true },
    { key: 'method', label: 'settServerMethod', type: 'select', options: ['GET', 'HEAD', 'POST'], default: 'GET' },
    { key: 'expectedStatus', label: 'settServerExpectedStatus', type: 'number', default: 200 },
    { key: 'interval', label: 'settServerInterval', type: 'number', default: 60 },
  ],
};

const SERVER_TYPE_LABELS = {
  cpanel: 'cPanel/WHM',
  ssh: 'Linux/SSH',
  plesk: 'Plesk',
  directadmin: 'DirectAdmin',
  cyberpanel: 'CyberPanel',
  hestiacp: 'HestiaCP',
  proxmox: 'Proxmox',
  uptime: 'Uptime Monitor',
};

const WORKING_TYPES = ['cpanel', 'ssh'];

let _settingsServers = [];
let _editingServerId = null;

async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    // Populate site name input
    const nameInput = document.getElementById('settSiteNameInput');
    if (nameInput) nameInput.value = data.site?.name || '';
    _settingsServers = data.servers || [];
    renderSettingsServerList();
  } catch (err) {
    console.error('Settings load error:', err);
  }
}

function renderSettingsServerList() {
  const container = document.getElementById('settServerList');
  if (!_settingsServers.length) {
    container.innerHTML = `<div class="settings-empty">${t('settNoServers')}</div>`;
    return;
  }
  container.innerHTML = _settingsServers.map((s) => {
    const typeLabel = SERVER_TYPE_LABELS[s.type] || s.type;
    const isWorking = WORKING_TYPES.includes(s.type);
    const comingSoon = isWorking ? '' : `<span class="coming-soon-badge">${t('settComingSoon')}</span>`;
    const al = s.accessLevel || 'readonly';
    const alBadge = s.type !== 'uptime' ? `<span class="access-badge ${al}">${al === 'readwrite' ? 'R/W' : 'RO'}</span>` : '';
    return `<div class="settings-server-card" onclick="openEditServerModal(${s.id})">
      <div class="settings-server-enabled ${s.enabled !== false ? 'online' : 'offline'}"></div>
      <div class="settings-server-info">
        <div class="settings-server-name">${escapeHtml(s.name)}</div>
        <div class="settings-server-host">${escapeHtml(s.host || s.url || '')}</div>
      </div>
      ${alBadge}
      <span class="settings-type-badge type-${s.type}">${typeLabel}${comingSoon}</span>
      <div class="settings-server-actions">
        <button class="btn btn-lang btn-sm" onclick="event.stopPropagation(); testServerConnection(${s.id}, this)">${t('settTestConnection')}</button>
      </div>
    </div>`;
  }).join('');
}

function openAddServerModal() {
  _editingServerId = null;
  document.getElementById('serverModalTitle').textContent = t('settAddServer');
  document.getElementById('serverModalDeleteBtn').classList.add('hidden');
  renderServerForm('cpanel', {});
  document.getElementById('serverModal').classList.remove('hidden');
}

function openEditServerModal(id) {
  const server = _settingsServers.find((s) => s.id === id);
  if (!server) return;
  _editingServerId = id;
  document.getElementById('serverModalTitle').textContent = t('settEditServer');
  document.getElementById('serverModalDeleteBtn').classList.remove('hidden');
  renderServerForm(server.type, server);
  document.getElementById('serverModal').classList.remove('hidden');
}

function closeServerModal() {
  document.getElementById('serverModal').classList.add('hidden');
  _editingServerId = null;
}

function renderFormField(field, data, isEdit) {
  const val = data[field.key] ?? field.default ?? '';
  const isSensitive = field.sensitive && isEdit;
  const hint = isSensitive ? `<div class="form-hint">${t('settCredentialKept')}</div>` : '';
  const hasFlag = data[`has_${field.key}`];
  const placeholderText = field.placeholder ? t(field.placeholder) : '';
  const placeholder = isSensitive && hasFlag ? '••••••••' : placeholderText;
  const req = field.required && !isSensitive ? 'required' : '';

  if (field.type === 'select') {
    const opts = (field.options || []).map((o) =>
      `<option value="${o}" ${val === o ? 'selected' : ''}>${o}</option>`
    ).join('');
    return `<div class="form-group">
      <label>${t(field.label)}</label>
      <select id="modal_${field.key}">${opts}</select>
    </div>`;
  } else if (field.type === 'textarea') {
    return `<div class="form-group">
      <label>${t(field.label)}</label>
      <textarea id="modal_${field.key}" rows="3" placeholder="${placeholder}" ${req}>${isSensitive ? '' : escapeHtml(String(val))}</textarea>
      ${hint}
    </div>`;
  } else {
    return `<div class="form-group">
      <label>${t(field.label)}</label>
      <input type="${field.type}" id="modal_${field.key}" value="${isSensitive ? '' : escapeHtml(String(val))}" placeholder="${placeholder}" ${req}>
      ${hint}
    </div>`;
  }
}

function renderServerForm(type, data) {
  const isEdit = !!data.id;
  const fields = SERVER_TYPE_FIELDS[type] || [];

  let html = `<div class="form-group">
    <label>${t('settServerType')}</label>
    <select id="modalServerType" onchange="handleServerTypeChange()">
      ${Object.keys(SERVER_TYPE_FIELDS).map((t2) => {
        const label = SERVER_TYPE_LABELS[t2];
        const badge = WORKING_TYPES.includes(t2) ? '' : ` (${t('settComingSoon')})`;
        return `<option value="${t2}" ${t2 === type ? 'selected' : ''}>${label}${badge}</option>`;
      }).join('')}
    </select>
  </div>`;

  const mainFields = fields.filter((f) => !f.group);
  const sshFields = fields.filter((f) => f.group === 'ssh');
  const hasSSHData = data.sshUsername || data.has_sshPassword || data.has_sshPrivateKey;

  for (const field of mainFields) {
    html += renderFormField(field, data, isEdit);
  }

  // Optional SSH section (collapsible)
  if (sshFields.length > 0) {
    const expanded = hasSSHData ? 'open' : '';
    html += `<details class="ssh-section" id="sshSection" ${expanded}>
      <summary class="ssh-section-toggle">${t('sshSection')}</summary>
      <div class="ssh-section-fields">`;
    for (const field of sshFields) {
      html += renderFormField(field, data, isEdit);
    }
    html += `</div></details>`;
  }

  // Access level select (skip for uptime type — no management concept)
  if (type !== 'uptime') {
    const al = data.accessLevel || 'readonly';
    html += `<div class="form-group">
      <label>${t('settServerAccessLevel')}</label>
      <select id="modal_accessLevel">
        <option value="readonly" ${al === 'readonly' ? 'selected' : ''}>${t('settAccessReadonly')}</option>
        <option value="readwrite" ${al === 'readwrite' ? 'selected' : ''}>${t('settAccessReadwrite')}</option>
      </select>
      <div class="form-hint">${t('settAccessHint')}</div>
    </div>`;
  }

  // Enabled checkbox
  const enabled = data.enabled !== false;
  html += `<div class="form-group">
    <div class="form-check">
      <input type="checkbox" id="modal_enabled" ${enabled ? 'checked' : ''}>
      <label>${t('settServerEnabled')}</label>
    </div>
  </div>`;

  // Test result placeholder
  html += `<div id="modalTestResult"></div>`;

  document.getElementById('serverModalBody').innerHTML = html;
}

function handleServerTypeChange() {
  const type = document.getElementById('modalServerType').value;
  // Preserve name if already typed
  const nameEl = document.getElementById('modal_name');
  const currentName = nameEl ? nameEl.value : '';
  renderServerForm(type, { name: currentName });
}

function getModalFormData() {
  const type = document.getElementById('modalServerType').value;
  const fields = SERVER_TYPE_FIELDS[type] || [];
  const data = { type };
  for (const field of fields) {
    const el = document.getElementById(`modal_${field.key}`);
    if (!el) continue;
    let val = el.value.trim();
    if (field.type === 'number' && val !== '') val = parseFloat(val);
    if (val !== '' && val !== 0) data[field.key] = val;
  }
  data.enabled = document.getElementById('modal_enabled')?.checked ?? true;
  const alEl = document.getElementById('modal_accessLevel');
  if (alEl) data.accessLevel = alEl.value;
  return data;
}

async function saveServer() {
  const data = getModalFormData();
  try {
    let res;
    if (_editingServerId) {
      res = await fetch(`/api/settings/servers/${_editingServerId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
    } else {
      res = await fetch('/api/settings/servers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
    }
    const result = await res.json();
    if (!res.ok) { alert(result.error || 'Error'); return; }
    closeServerModal();
    settingsDataLoaded = false;
    loadSettings();
    // Refresh WHM data if it was loaded
    whmDataLoaded = false;
    dashboardDataLoaded = false;
  } catch (err) {
    alert(err.message);
  }
}

async function deleteServerSetting() {
  if (!_editingServerId) return;
  if (!confirm(t('settConfirmDelete'))) return;
  try {
    const res = await fetch(`/api/settings/servers/${_editingServerId}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Error'); return; }
    closeServerModal();
    settingsDataLoaded = false;
    loadSettings();
    whmDataLoaded = false;
    dashboardDataLoaded = false;
  } catch (err) {
    alert(err.message);
  }
}

async function testServerConnection(id, btnEl) {
  const origText = btnEl.textContent;
  btnEl.textContent = t('settTesting');
  btnEl.disabled = true;
  try {
    const res = await fetch(`/api/settings/servers/${id}/test`, { method: 'POST' });
    const data = await res.json();
    // Show inline result
    const card = btnEl.closest('.settings-server-card');
    let resultEl = card.querySelector('.settings-test-result');
    if (!resultEl) {
      resultEl = document.createElement('div');
      resultEl.className = 'settings-test-result';
      card.appendChild(resultEl);
    }
    if (data.success) {
      resultEl.className = 'settings-test-result success';
      resultEl.textContent = `${data.message} (${data.responseTime}ms)`;
    } else {
      resultEl.className = 'settings-test-result fail';
      resultEl.textContent = data.message;
    }
    setTimeout(() => resultEl.remove(), 5000);
  } catch (err) {
    alert(err.message);
  }
  btnEl.textContent = origText;
  btnEl.disabled = false;
}

async function saveSiteName() {
  const nameInput = document.getElementById('settSiteNameInput');
  const name = nameInput.value.trim();
  try {
    const res = await fetch('/api/settings/site', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    // Update UI immediately
    document.title = name;
    const h1 = document.getElementById('siteTitle');
    if (h1) h1.textContent = name;
    const ft = document.getElementById('siteFooter');
    if (ft) ft.textContent = name;
  } catch (err) {
    alert(err.message);
  }
}

// ── Init ──
document.getElementById('refreshBtn').addEventListener('click', handleRefresh);
document.getElementById('langBtn').addEventListener('click', toggleLanguage);
document.getElementById('settAddServerBtn').addEventListener('click', openAddServerModal);
document.getElementById('settSaveNameBtn').addEventListener('click', saveSiteName);
document.getElementById('serverModalSaveBtn').addEventListener('click', saveServer);
document.getElementById('serverModalDeleteBtn').addEventListener('click', deleteServerSetting);

applyLanguage();
applyTheme();
initSearch();
initReleaseSearch();

// Load site name from server config (.env SITE_NAME)
fetch('/api/config').then((r) => r.json()).then((cfg) => {
  if (cfg.siteName) {
    document.title = cfg.siteName;
    const h1 = document.getElementById('siteTitle');
    if (h1) h1.textContent = cfg.siteName;
    const ft = document.getElementById('siteFooter');
    if (ft) ft.textContent = cfg.siteName;
  }
}).catch(() => {});

loadDashboard();
dashboardDataLoaded = true;
