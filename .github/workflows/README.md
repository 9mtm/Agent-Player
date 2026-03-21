# GitHub Actions Workflows

## Automated Release Pipeline

### `release.yml` - Complete Release Automation

**Trigger**: When you push a version tag (e.g., `v1.3.0`)

```bash
git tag v1.3.0
git push origin v1.3.0
```

**What it does (fully automated):**

1. **Job 1: Create Release ZIP** (Windows runner, ~2 min)
   - Compresses application files
   - Excludes: node_modules, .next, .git, target, installer, etc.
   - Output: `agent-player-files.zip` (~90 MB)

2. **Job 2: Build Windows Installer** (Windows runner, ~5 min)
   - Builds Tauri MSI installer
   - Output: `agent-player-installer-{version}-win-x64.msi` (~3 MB)

3. **Job 3: Build Linux AppImage** (Ubuntu runner, ~8 min)
   - Builds Tauri AppImage
   - Output: `agent-player-installer-{version}-linux-x86_64.AppImage` (~80 MB)

4. **Job 4: Build macOS DMG** (macOS runner, ~7 min)
   - Builds Tauri DMG
   - Output: `agent-player-installer-{version}-macos-x64.dmg` (~3 MB)

5. **Job 5: Create GitHub Release** (Ubuntu runner, ~1 min)
   - Generates SHA256 checksums
   - Creates GitHub Release with release notes
   - Uploads all files (3 installers + 1 zip + checksums)
   - Publishes release publicly

**Total time**: 10-12 minutes

**Zero manual work required** ✅

---

## Architecture

```
Push Tag (v1.3.0)
    ↓
GitHub Actions Triggered
    ↓
┌─────────────────────────────────────────────┐
│  5 Jobs Run in Parallel                     │
├─────────────────────────────────────────────┤
│  1. Compress Files (Windows)    [2 min]    │
│  2. Build Windows MSI (Windows) [5 min]    │
│  3. Build Linux AppImage (Ubuntu) [8 min]  │
│  4. Build macOS DMG (macOS)     [7 min]    │
└─────────────────────────────────────────────┘
    ↓ (All 4 complete)
┌─────────────────────────────────────────────┐
│  5. Create Release (Ubuntu)     [1 min]    │
│     - Download all artifacts                │
│     - Generate checksums                    │
│     - Create GitHub Release                 │
│     - Upload all files                      │
└─────────────────────────────────────────────┘
    ↓
Release Published ✅
https://github.com/9mtm/Agent-Player/releases/tag/v1.3.0
```

---

## Files Created

Each release creates these files:

| File | Size | Platform | Purpose |
|------|------|----------|---------|
| `agent-player-installer-{v}-win-x64.msi` | ~3 MB | Windows | Stub installer |
| `agent-player-installer-{v}-linux-x86_64.AppImage` | ~80 MB | Linux | Self-contained installer |
| `agent-player-installer-{v}-macos-x64.dmg` | ~3 MB | macOS | Stub installer |
| `agent-player-files.zip` | ~90 MB | All | Application files (downloaded by stub installer) |
| `checksums.txt` | ~1 KB | All | SHA256 verification |

---

## Why This Approach?

### Professional Standard
- ✅ **VSCode**: Uses CI/CD for multi-platform builds
- ✅ **Chrome**: Automated release pipeline
- ✅ **Firefox**: GitHub Actions for builds
- ✅ **Docker Desktop**: Complete automation

### Benefits
- 🚀 **95% time saving**: 1.5 hours → 10 minutes
- ✅ **Zero human errors**: Automated = consistent
- 🌍 **Multi-platform**: 3 platforms built simultaneously
- 🔄 **Repeatable**: Same process every time
- 📦 **Professional**: Industry-standard approach

---

## Troubleshooting

### Workflow fails at "Create Release ZIP"
**Issue**: File exclusion or compression error
**Fix**: Test locally with `.\scripts\compress-for-release.ps1`

### Workflow fails at "Build Windows/Linux/macOS"
**Issue**: Tauri build error or missing dependencies
**Fix**: Check `installer/Cargo.toml` dependencies, test `cargo tauri build` locally

### Workflow fails at "Create GitHub Release"
**Issue**: Permission denied or missing artifact
**Fix**: Check repo settings → Actions → Permissions (needs `contents: write`)

### Release created but installer can't download zip
**Issue**: URL mismatch or file missing
**Fix**: Verify URL format in `installer/src/setup/bundler.rs` matches GitHub Releases structure

---

## Monitoring

**Watch workflow progress:**
```
https://github.com/9mtm/Agent-Player/actions
```

**View releases:**
```
https://github.com/9mtm/Agent-Player/releases
```

**Check workflow logs:**
1. Go to Actions tab
2. Click on the workflow run
3. Click on any job
4. Expand steps to see detailed logs

---

## Future Enhancements

- [ ] Code signing for Windows (Authenticode)
- [ ] Code signing for macOS (Apple Developer ID)
- [ ] Automated testing after build
- [ ] Nightly builds from main branch
- [ ] Beta/pre-release channel

---

**Created**: 2026-03-21
**Status**: Production Ready ✅
