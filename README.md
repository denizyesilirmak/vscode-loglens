# LogLens

Unified mobile device logging for VS Code. Monitor Android and iOS logs side-by-side without context switching.

[![Version](https://img.shields.io/vscode-marketplace/v/denizyesilirmak.loglens)](https://marketplace.visualstudio.com/items?itemName=denizyesilirmak.loglens)
[![Installs](https://img.shields.io/vscode-marketplace/i/denizyesilirmak.loglens)](https://marketplace.visualstudio.com/items?itemName=denizyesilirmak.loglens)
[![Rating](https://img.shields.io/vscode-marketplace/r/denizyesilirmak.loglens)](https://marketplace.visualstudio.com/items?itemName=denizyesilirmak.loglens)

## Overview

LogLens brings native Android and iOS device logging directly into VS Code. Debug mobile applications without switching between multiple tools or opening Logcat/Xcode. View logs from multiple devices simultaneously with intelligent filtering and color-coded severity levels.

Whether you're testing on physical devices or simulators, LogLens streamlines the mobile debugging workflow into a single, focused interface.

## Core Features

**Android Support**
- Real-time logcat streaming with automatic device detection
- Monitor multiple Android devices and AVDs simultaneously  
- Filter by log level (Verbose, Debug, Info, Warning, Error), tag, process, or custom keywords
- Support for multiple buffer types (main, system, radio, events, crash)

**iOS Support**
- Direct iOS Simulator log monitoring with live updates
- Multi-simulator support for parallel testing
- Application-specific log filtering
- Native Xcode integration

**Developer Workflow**
- Side-by-side Android and iOS log panels for cross-platform development
- Color-coded log levels for instant visual identification
- Zero context switching—stay in VS Code throughout debugging sessions
- Lightweight implementation with minimal performance overhead

## Getting Started

### Requirements

**Android Development**
- ADB (Android Debug Bridge) in your PATH
- USB debugging enabled on connected devices
- Android SDK tools installed

**iOS Development**
- Xcode with command line tools (`xcode-select --install`)
- Running iOS Simulator instance
- macOS system

### Installation

1. Install LogLens from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=denizyesilirmak.loglens)
2. Open the Mobile Logs panel (look for the panel icon in VS Code's sidebar)
3. Connect your devices and start monitoring

No additional configuration needed—the extension auto-detects your development environment.

## Usage

### Android Logs

1. Select a connected device or running AVD
2. Choose your desired log level filter
3. Optionally select a specific buffer (main, system, radio, events, crash)
4. Use the search field to find specific log entries by tag, process name, or content
5. Start monitoring with the play button; pause/stop as needed

### iOS Logs

1. Select a booted iOS Simulator from the dropdown
2. (Optional) Filter logs to a specific app bundle identifier
3. Monitor streaming simulator output in real-time
4. Use search to narrow results

### Color Legend

| Level | Color | Meaning |
|-------|-------|---------|
| Error | Red | Critical failures requiring attention |
| Warning | Yellow | Potential issues that may need investigation |
| Info | Blue | Standard application events |
| Debug | Green | Detailed diagnostic information |
| Verbose | Gray | Low-level system details |

## Troubleshooting

**Android device not detected?**
- Verify `adb devices` shows your device
- Enable USB debugging in device settings
- Try the "Refresh device list" command

**iOS Simulator not appearing?**
- Ensure Xcode is installed and simulator is running
- Verify command line tools: `xcode-select --install`
- Restart VS Code if simulator was launched after extension load

**Logs not appearing?**
- Confirm the app is running and generating output
- Try different log level filters
- Check device authorization/permissions

## License & Contributing

LogLens is open source under the MIT License. Contributions are welcome—fork the repository, create a feature branch, and submit a pull request.

See [CHANGELOG.md](CHANGELOG.md) for version history and [LICENSE](LICENSE) for license details.

---

Built by [Deniz Yesilirmak](https://github.com/denizyesilirmak)
