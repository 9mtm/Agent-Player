#!/bin/bash

# Agent Player Installer Build Script
# Builds installers for all platforms (Windows, Linux, macOS)
#
# Prerequisites:
# - Rust 1.70+ installed
# - Tauri CLI installed: cargo install tauri-cli
# - Platform-specific build tools:
#   - Windows: Visual Studio 2019+ or Build Tools, WiX Toolset 3.11+
#   - Linux: libwebkit2gtk-4.1-dev, build-essential, curl, wget, file, libssl-dev
#   - macOS: Xcode Command Line Tools

set -e  # Exit on error

VERSION="1.3.0"
INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/installer"
OUTPUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/releases"

echo "========================================"
echo "Agent Player Installer Build Script"
echo "Version: $VERSION"
echo "========================================"
echo ""

# Detect platform
OS="$(uname -s)"
case "$OS" in
    Linux*)     PLATFORM="Linux";;
    Darwin*)    PLATFORM="macOS";;
    MINGW*|MSYS*|CYGWIN*)    PLATFORM="Windows";;
    *)          echo "Unsupported OS: $OS"; exit 1;;
esac

echo "Platform detected: $PLATFORM"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Navigate to installer directory
cd "$INSTALLER_DIR"

# Check Rust and Cargo
echo "[1/6] Checking Rust and Cargo..."
if ! command -v cargo &> /dev/null; then
    echo "Error: Cargo not found. Please install Rust from https://rustup.rs/"
    exit 1
fi
echo "✓ Cargo found: $(cargo --version)"
echo ""

# Check Tauri CLI
echo "[2/6] Checking Tauri CLI..."
if ! cargo tauri --version &> /dev/null; then
    echo "Tauri CLI not found. Installing..."
    cargo install tauri-cli
fi
echo "✓ Tauri CLI found: $(cargo tauri --version)"
echo ""

# Install dependencies
echo "[3/6] Installing Rust dependencies..."
cargo update
echo "✓ Dependencies installed"
echo ""

# Build installer based on platform
echo "[4/6] Building installer for $PLATFORM..."

if [ "$PLATFORM" = "Windows" ]; then
    # Windows: Build .msi installer
    echo "Building Windows .msi installer..."
    cargo tauri build --bundles msi

    # Copy output
    MSI_FILE=$(find target/release/bundle/msi -name "*.msi" | head -n 1)
    if [ -f "$MSI_FILE" ]; then
        cp "$MSI_FILE" "$OUTPUT_DIR/agent-player-installer-${VERSION}-win-x64.msi"
        echo "✓ Windows installer created: agent-player-installer-${VERSION}-win-x64.msi"
    else
        echo "Error: MSI file not found"
        exit 1
    fi

elif [ "$PLATFORM" = "Linux" ]; then
    # Linux: Build .AppImage
    echo "Building Linux .AppImage..."
    cargo tauri build --bundles appimage

    # Copy output
    APPIMAGE_FILE=$(find target/release/bundle/appimage -name "*.AppImage" | head -n 1)
    if [ -f "$APPIMAGE_FILE" ]; then
        cp "$APPIMAGE_FILE" "$OUTPUT_DIR/agent-player-installer-${VERSION}-linux-x86_64.AppImage"
        chmod +x "$OUTPUT_DIR/agent-player-installer-${VERSION}-linux-x86_64.AppImage"
        echo "✓ Linux installer created: agent-player-installer-${VERSION}-linux-x86_64.AppImage"
    else
        echo "Error: AppImage file not found"
        exit 1
    fi

elif [ "$PLATFORM" = "macOS" ]; then
    # macOS: Build .dmg
    echo "Building macOS .dmg..."
    cargo tauri build --bundles dmg

    # Copy output
    DMG_FILE=$(find target/release/bundle/dmg -name "*.dmg" | head -n 1)
    if [ -f "$DMG_FILE" ]; then
        cp "$DMG_FILE" "$OUTPUT_DIR/agent-player-installer-${VERSION}-macos-universal.dmg"
        echo "✓ macOS installer created: agent-player-installer-${VERSION}-macos-universal.dmg"
    else
        echo "Error: DMG file not found"
        exit 1
    fi
fi

echo ""
echo "[5/6] Generating checksums..."
cd "$OUTPUT_DIR"

# Generate SHA256 checksums
if [ "$PLATFORM" = "Windows" ]; then
    FILES="agent-player-installer-${VERSION}-win-x64.msi"
elif [ "$PLATFORM" = "Linux" ]; then
    FILES="agent-player-installer-${VERSION}-linux-x86_64.AppImage"
else
    FILES="agent-player-installer-${VERSION}-macos-universal.dmg"
fi

for FILE in $FILES; do
    if [ -f "$FILE" ]; then
        sha256sum "$FILE" >> "checksums-${PLATFORM}.txt"
        echo "✓ Checksum generated for $FILE"
    fi
done

echo ""
echo "[6/6] Build summary"
echo "========================================"
echo "Platform: $PLATFORM"
echo "Version: $VERSION"
echo "Output directory: $OUTPUT_DIR"
echo ""
echo "Generated files:"
ls -lh "$OUTPUT_DIR"
echo ""
echo "✓ Build complete!"
echo ""
echo "Next steps:"
echo "1. Test the installer on a clean VM"
echo "2. Code sign the installer (see docs/RELEASE_CHECKLIST.md)"
echo "3. Upload to GitHub Releases"
echo "========================================"
