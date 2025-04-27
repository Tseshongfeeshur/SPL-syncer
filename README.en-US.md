# SPL Lyrics Synchronizer

![Icon](./favicon.png)

A convenient and efficient tool for creating **word-by-word timestamps** for lyrics in the [SPL standard format](https://moriafly.com/standards/spl.html) used by [Salt Player](https://github.com/Moriafly/SaltPlayerSource).

## ✨ Features

- **Word-level Synchronization**: Create precise timestamps for individual words or characters
- **Multiple Format Support**: Import LRC, plain text, or SPL format lyrics
- **Intelligent Word Segmentation**: Automatically handles mixed CJK and Latin text
- **Keyboard Shortcuts**: Comprehensive shortcut system for efficient workflow
- **Real-time Visual Feedback**: Immediate visual cues for synchronization progress
- **Dark Mode Support**: Automatically adapts to system light/dark theme settings
- **Client-side Only**: No server dependencies, works completely in the browser

## 🚀 Quick Start

- **[Use Online](https://spl-syncer.ryanyuan.top/)**: No installation required
- **[GitHub Repository](https://github.com/Tseshongfeeshur/SPL-syncer/)**: Access source code or submit issues
- **[Telegram Group](https://t.me/+J-duJdQv1GAzYjE1)**: Join the community

> **Note**: This tool is currently only guaranteed to work in the latest version of Chrome.

## 📖 User Guide

1. Open the [web application](https://spl-syncer.ryanyuan.top/)
2. Click the "+" button in the top-right corner and select "Load Audio" to import your music file
3. Click the "+" button again and select "Load Lyrics" or "Edit Lyrics" to import or create lyrics
4. Play the audio and click the "Tag" button at the exact moment each word begins (Require an extra click at the end of each line)
5. When finished, click the "Copy" button to get the synchronized SPL format lyrics

For detailed instructions, click the "?" button in the top-right corner of the application to access the interactive tutorial.

### ⌨️ Keyboard Shortcuts

| Left Hand | Function | Right Hand | Function |
|-----------|----------|------------|----------|
| S | Step back 2 seconds | I | Jump to previous line |
| D | Play/Pause | J | Jump to previous word |
| F | Step forward 2 seconds | K | Tag timestamp |
| | | L | Jump to next word |
| | | M | Jump to next line |

## 🔧 Development Roadmap

- [ ] Fix word segmentation issues when reimporting lyrics
- [ ] Add lyrics preview playback feature

## 📄 License

This project is open-source software licensed under the [GNU General Public License v3.0](./LICENSE).