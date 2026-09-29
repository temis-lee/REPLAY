# WLAN Video Player

A self-hosted HTML/CSS/JavaScript video player with:
- Liquid-glass UI
- Local file playback
- Drag and drop
- WLAN/server video library
- HTTP Range streaming for seeking
- Auto-hide controls
- Touch/double-zone seeking
- Picture in Picture
- Fullscreen
- Playback speed
- Resume position
- Playlist and auto-next

## Requirements

Node.js 18+ recommended.

## Install

Open a terminal in this folder:

```bash
npm install
```

## Add server videos

Put videos into:

```text
videos/
```

For example:

```text
videos/
  movie.mp4
  lecture.mp4
  demo.webm
```

## Start

```bash
npm start
```

Then on the host computer open:

```text
http://localhost:3000
```

## Use over WLAN

The server listens on `0.0.0.0`, so devices on the same Wi-Fi/LAN can connect to the host computer's private IP.

Example:

```text
http://192.168.1.20:3000
```

Find the host IP with:

### Windows

```powershell
ipconfig
```

Look for `IPv4 Address`.

### macOS

```bash
ipconfig getifaddr en0
```

### Linux

```bash
hostname -I
```

## Windows firewall

If another device cannot connect, allow Node.js through the private-network firewall or create an inbound TCP rule for port 3000.

Do NOT expose this server directly to the public internet without adding authentication, access controls, TLS, and other security measures.

## Browser support

MP4/H.264 is the safest format for cross-device playback. WebM is also widely supported. Some containers/codecs such as MKV may be listed by the server but may not play in every browser.
