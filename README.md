# LogLens 📱

**View Android adb logcat and iOS Simulator logs side-by-side directly inside VS Code. Filter, color-highlight, and manage device logs without leaving your editor.**

[![Version](https://img.shields.io/vscode-marketplace/v/denizyesilirmak.loglens)](https://marketplace.visualstudio.com/items?itemName=denizyesilirmak.loglens)
[![Installs](https://img.shields.io/vscode-marketplace/i/denizyesilirmak.loglens)](https://marketplace.visualstudio.com/items?itemName=denizyesilirmak.loglens)
[![Rating](https://img.shields.io/vscode-marketplace/r/denizyesilirmak.loglens)](https://marketplace.visualstudio.com/items?itemName=denizyesilirmak.loglens)

## ✨ Features

### 🤖 Android Development

- **Real-time logcat monitoring** - Stream Android device logs directly in VS Code
- **Multiple device support** - Connect and monitor multiple Android devices simultaneously
- **Advanced filtering** - Filter by log level, process name, tag, or custom keywords
- **Color-coded log levels** - Visual distinction between Error, Warning, Info, Debug, and Verbose logs
- **AVD management** - Quick access to Android Virtual Devices

### 🍎 iOS Development

- **iOS Simulator logs** - Monitor iOS Simulator logs in real-time
- **Multi-simulator support** - Handle multiple booted simulators
- **App-specific filtering** - Filter logs by specific iOS applications
- **Seamless Xcode integration** - Works alongside your existing iOS development workflow

### 🎯 Developer Experience

- **Side-by-side panels** - Monitor both Android and iOS logs simultaneously
- **No context switching** - Stay in VS Code while debugging mobile applications
- **Lightweight and fast** - Minimal performance impact on your development environment
- **Easy setup** - Automatic detection of ADB and Xcode installations

## 🚀 Quick Start

1. **Install the extension** from the VS Code Marketplace
2. **Open the Mobile Logs panel** - Look for the "Mobile Logs" panel in VS Code's panel area
3. **Connect your devices**:
   - For Android: Ensure ADB is installed and device is connected
   - For iOS: Launch iOS Simulator from Xcode
4. **Start monitoring** - Click the start button in the respective Android or iOS panel

## 📋 Requirements

### Android Development

- **ADB (Android Debug Bridge)** installed and available in PATH
- Android device connected via USB or network ADB
- USB debugging enabled on your device

### iOS Development

- **Xcode** installed (macOS only)
- iOS Simulator running
- Xcode command line tools installed

## 🎮 Usage

### Android Logs Panel

1. **Device Selection**: Choose from connected Android devices or running AVDs
2. **Log Level Filtering**: Filter by Verbose, Debug, Info, Warning, or Error
3. **Buffer Selection**: Choose from main, system, radio, events, or crash buffers
4. **Start/Stop Monitoring**: Control log streaming with intuitive buttons
5. **Keyword Filtering**: Search for specific terms in log messages

### iOS Logs Panel

1. **Simulator Selection**: Choose from booted iOS Simulators
2. **App Filtering**: Monitor logs from specific iOS applications
3. **Real-time Updates**: Live streaming of simulator logs
4. **Start/Stop Controls**: Easy log monitoring management

## 🎨 Log Color Coding

LogLens uses intuitive color coding to help you quickly identify different log levels:

- 🔴 **Error** - Critical issues that need immediate attention
- 🟡 **Warning** - Important notices that might indicate problems
- 🔵 **Info** - General informational messages
- 🟢 **Debug** - Detailed debugging information
- ⚪ **Verbose** - Highly detailed diagnostic information

## ⚙️ Configuration

LogLens automatically detects your development environment setup. No additional configuration is required for basic usage.

### Environment Detection

The extension automatically checks for:

- ADB installation and version
- Connected Android devices
- Available Android AVDs
- Xcode installation and version
- Running iOS Simulators

## 🔧 Commands

LogLens integrates seamlessly with VS Code's command palette:

- Open Android Logs panel
- Open iOS Logs panel  
- Refresh device list
- Kill ADB server (Android)

## 🐛 Troubleshooting

### Android Issues

**Device not detected?**

- Ensure USB debugging is enabled
- Check ADB installation: `adb devices`
- Try restarting ADB server: use the "Kill ADB Server" button

**Logs not appearing?**

- Verify device authorization
- Check if the app is running and generating logs
- Try different log level filters

### iOS Issues

**Simulator not detected?**

- Ensure Xcode is properly installed
- Launch iOS Simulator from Xcode
- Check Xcode command line tools: `xcode-select --install`

**No logs appearing?**

- Make sure the simulator is fully booted
- Launch an app in the simulator to generate logs
- Try restarting the simulator

## 🤝 Contributing

We welcome contributions! If you'd like to contribute to LogLens:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Support

If you find LogLens helpful, please consider:

- ⭐ Starring the repository
- 📝 Leaving a review on the VS Code Marketplace
- 🐛 Reporting issues and suggesting features
- 📢 Sharing with fellow mobile developers

---

## Happy Mobile Development! 🚀📱

Made with ❤️ by [Deniz Yesilirmak](https://github.com/denizyesilirmak)
