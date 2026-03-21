# Agent Player - Stub/Web Installer (Option 2)

## Overview

The Agent Player installer uses a **Stub/Web Installer** approach (similar to Chrome, Firefox, and Docker Desktop). This means:

- **Small installer size**: ~3 MB (instead of ~100 MB embedded installer)
- **Downloads files during installation** from GitHub Releases
- **Fast updates**: Upload new zip to GitHub Releases, no need to rebuild installer
- **Professional standard**: Used by major desktop applications

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Stub Installer (~3 MB)                             │
│  ├── Tauri Rust Core                                │
│  ├── 8-Step Setup Wizard UI                         │
│  └── Download & Extract Logic                       │
└─────────────────────────────────────────────────────┘
                    │
                    │ Downloads during installation
                    ▼
┌─────────────────────────────────────────────────────┐
│  GitHub Releases CDN                                │
│  https://github.com/9mtm/Agent-Player/releases/     │
│  └── agent-player-files.zip (~90 MB)                │
└─────────────────────────────────────────────────────┘
                    │
                    │ Extracts to
                    ▼
┌─────────────────────────────────────────────────────┐
│  User's Installation Directory                      │
│  C:\Program Files\Agent Player\                     │
│  (or user-selected directory)                       │
└─────────────────────────────────────────────────────┘
```

## Key Features

### 1. Download Engine (`bundler.rs`)
- **Function**: `download_and_extract_from_github()`
- **Features**:
  - Async download with progress tracking (every 10 MB)
  - 5-minute timeout for large files
  - Automatic extraction to installation directory
  - Cleanup of temporary files
  - Error handling with detailed messages

### 2. Installation Steps (Modified)
| Step | Action | Details |
|------|--------|---------|
| 1 | Welcome + System Check | Unchanged |
| 2 | License Agreement | Unchanged |
| 3 | Installation Directory | Unchanged |
| 4 | Deployment Mode | Unchanged |
| 5 | Configuration | Unchanged |
| 6 | Admin Account | Unchanged |
| 7 | **Installation Progress** | **Changed: Downloads from GitHub** |
| 8 | Completion | Unchanged |

### 3. GitHub Release Structure
```
Release: v1.3.0
├── agent-player-installer-1.3.0-win-x64.msi (~3 MB)
├── agent-player-installer-1.3.0-linux-x86_64.AppImage (~3 MB)
├── agent-player-installer-1.3.0-macos-x64.dmg (~3 MB)
├── agent-player-files.zip (~90 MB)  ← Downloaded by installer
└── checksums.txt
```

## How It Works

### Installation Flow
1. User downloads small stub installer (~3 MB)
2. User runs installer and completes configuration steps
3. During "Installation Progress" step:
   - Installer downloads `agent-player-files.zip` from GitHub
   - Extracts files to selected directory
   - Installs dependencies with `pnpm install --prod`
   - Configures auto-start and creates admin user
4. Installation complete - Agent Player ready to use

### Update Flow (Phase 6 Auto-Updater)
1. User clicks "Check for Updates" in system tray
2. Auto-updater checks GitHub Releases API
3. If new version available:
   - Downloads only changed files (incremental)
   - Installs update
   - Restarts application
4. No need to reinstall or download full zip

## Developer Workflow

### Building the Installer
```powershell
# 1. Navigate to installer directory
cd C:\MAMP\htdocs\agent\agent_player\installer

# 2. Build the stub installer
cargo tauri build

# Output:
# - Windows: target\release\bundle\msi\agent-player-installer-1.3.0-win-x64.msi
# - Linux: target/release/bundle/appimage/agent-player-installer-1.3.0-linux-x86_64.AppImage
# - macOS: target/release/bundle/dmg/agent-player-installer-1.3.0-macos-x64.dmg
```

### Creating Release Zip
```powershell
# 1. Navigate to project root
cd C:\MAMP\htdocs\agent\agent_player

# 2. Run compression script
.\scripts\compress-for-release.ps1

# Output: agent-player-files.zip (~90 MB)
# Excludes: node_modules, .next, .git, target, installer, .cache, dist, .turbo
```

### Publishing a Release
1. Go to: https://github.com/9mtm/Agent-Player/releases/new
2. Create new tag: `1.3.0`
3. Release title: `Agent Player v1.3.0`
4. Upload files:
   - `agent-player-installer-1.3.0-win-x64.msi`
   - `agent-player-installer-1.3.0-linux-x86_64.AppImage`
   - `agent-player-installer-1.3.0-macos-x64.dmg`
   - `agent-player-files.zip`
   - `checksums.txt`
5. Click "Publish release"

### Deploying an Update
To deploy a new version:
1. Make code changes
2. Run `.\scripts\compress-for-release.ps1`
3. Upload new `agent-player-files.zip` to GitHub Releases
4. Users get notified by auto-updater (Phase 6)

**No need to rebuild installer** - it always downloads the latest zip from the specified version tag.

## Comparison: Stub vs Embedded

| Feature | Stub Installer (Option 2) | Embedded Installer (Option 1) |
|---------|---------------------------|-------------------------------|
| **Installer Size** | ~3 MB | ~100 MB |
| **First Install** | Download + Install (~5 min) | Extract (~2 min) |
| **Updates** | Auto-updater (incremental) | Full reinstall |
| **Dev Speed** | Fast (upload zip) | Slow (rebuild installer) |
| **Offline Install** | ❌ Needs internet first time | ✅ Fully offline |
| **Bandwidth** | User downloads once | Distributes 100 MB per download |
| **Examples** | Chrome, Firefox, Docker | VSCode, Discord, Steam |

## Configuration

### Changing Version
To change the version being downloaded, edit [ui/dist/index.html](ui/dist/index.html):
```javascript
await invoke('download_and_extract_from_github', {
    installDir: installDir,
    version: '1.3.0'  // ← Change this
});
```

### Changing GitHub Repo
To change the GitHub repository, edit [src/setup/bundler.rs](src/setup/bundler.rs):
```rust
let url = format!(
    "https://github.com/9mtm/Agent-Player/releases/download/{}/agent-player-files.zip",
    //                 ^^^^ Change repo owner/name here
    version
);
```

## Advantages

### For Users
- **Smaller download**: 3 MB vs 100 MB initial download
- **Faster updates**: Only download changed files
- **Always latest**: Installer can download any version
- **Lower bandwidth**: No need to re-download full installer for updates

### For Developers
- **Faster CI/CD**: Upload 90 MB zip instead of rebuilding 100 MB installer
- **Easier testing**: Test installer with different file versions without rebuilding
- **Flexible deployment**: Can deploy hotfixes by just uploading new zip
- **Lower distribution cost**: GitHub Releases provides free CDN

## Security Considerations

### HTTPS Only
All downloads use HTTPS from GitHub Releases:
```
https://github.com/9mtm/Agent-Player/releases/download/1.3.0/agent-player-files.zip
```

### Checksum Verification (Future Enhancement)
TODO: Add SHA256 checksum verification:
1. Generate `checksums.txt` during compression
2. Download checksums from GitHub Releases
3. Verify zip integrity before extraction

### Code Signing (Future Enhancement)
TODO: Sign installers with code signing certificate:
- Windows: Authenticode signature
- macOS: Apple Developer ID
- Linux: GPG signature

## Troubleshooting

### Download Fails
**Error**: "Failed to download from GitHub"
**Solution**:
- Check internet connection
- Verify GitHub Releases URL is accessible
- Check if version exists on GitHub Releases

### Extraction Fails
**Error**: "Failed to read ZIP archive"
**Solution**:
- Corrupted download - try reinstalling
- Insufficient disk space - free up space
- Antivirus blocking - whitelist installer

### Timeout Error
**Error**: "Failed to download: timeout"
**Solution**:
- Slow internet connection - installer has 5-minute timeout
- Large file size - may need to increase timeout in bundler.rs
- Network proxy - configure proxy settings

## Future Enhancements

### Phase 1: Current Implementation ✅
- [x] Async download with progress tracking
- [x] Automatic extraction
- [x] Error handling
- [x] Cleanup temporary files

### Phase 2: Security Hardening 🔄
- [ ] SHA256 checksum verification
- [ ] Code signing for all platforms
- [ ] HTTPS certificate pinning

### Phase 3: Advanced Features 🔄
- [ ] Resume interrupted downloads
- [ ] Delta updates (binary diff)
- [ ] Torrent-based distribution (optional)
- [ ] Mirror CDN support

### Phase 4: User Experience 🔄
- [ ] Download speed indicator (MB/s)
- [ ] Estimated time remaining
- [ ] Pause/resume download
- [ ] Background download mode

## Additional Resources

- **GitHub Releases API**: https://docs.github.com/en/rest/releases
- **Tauri v2 Docs**: https://v2.tauri.app/
- **Rust async/await**: https://rust-lang.github.io/async-book/
- **Chrome Installer Architecture**: Similar stub/web installer approach

---

**Created**: 2026-03-21
**Version**: 1.3.0
**Status**: Implemented and tested
