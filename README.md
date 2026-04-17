# Screen and Webcam Recorder Desktop App

A desktop screen recorder built with Electron.

This app allows a user to:
- View all available screens and windows
- Select a screen/window source
- Record that source
- Optionally capture webcam video in parallel
- Save each recording session in a unique UUID folder inside videos/
- Store output as separate files (not merged):
  - screen.webm
  - webcam.webm (only if webcam was enabled)

## Assignment Requirement Coverage

### Implemented
- Electron desktop application
- Source discovery (screen and window list)
- Screen/window selection
- Screen recording
- Optional webcam recording
- Separate outputs for screen and webcam
- UUID-based session folder per recording session
- Live recording timer in UI
- Open last session folder from UI
- Graceful edge-case handling for:
  - Camera permission denied
  - Screen permission denied
  - User stops sharing externally
  - App close while recording

### Not Implemented (Intentionally)
These are optional/stretch features from the assignment and are intentionally skipped to keep code simple and focused:
- Recording complete page
- Session rename
- Export settings (bitrate/format/custom location)
- Merged final video output (final.mp4)

## Tech Stack
- Electron
- HTML/CSS
- Vanilla JavaScript (CommonJS)
- UUID package for session folder naming

## Project Structure

```text
Screen_Recorder_Desktop/
├── index.html
├── styles.css
├── renderer.js
├── preload.js
├── main.js
├── package.json
├── package-lock.json
└── videos/
    └── <uuid>/
        ├── screen.webm
        └── webcam.webm
```

## How It Works (Architecture)

### Main Process
File: main.js
- Creates Electron BrowserWindow
- Returns available display/window sources via desktopCapturer
- Creates and manages recording session directories
- Saves recording buffers to disk
- Opens session folder in file explorer
- Coordinates graceful app close when recording is active

### Preload Bridge
File: preload.js
- Exposes safe IPC methods to renderer via contextBridge
- Prevents direct Node access from renderer while enabling required actions

### Renderer Process
File: renderer.js
- Handles UI events and recording lifecycle
- Starts/stops MediaRecorder for screen and webcam streams
- Keeps webcam tied to active screen recording
- Tracks recording state and live timer
- Handles runtime errors and permission issues with user feedback

## Setup

### Prerequisites
- Node.js 18+ recommended
- npm
- Windows/macOS/Linux desktop environment with screen capture support

### Install

```bash
npm install
```

### Run

Production-like run:

```bash
npm start
```

Development mode (auto-restart on changes):

```bash
npm run dev
```

## End-to-End Usage Flow

1. Start the app.
2. Click Load Screens.
3. Select a source from the dropdown.
4. Optional: check Record webcam with audio.
5. Click Start Recording.
6. Timer starts and status changes to Recording.
7. If webcam checkbox is checked during recording, webcam capture starts.
8. If webcam checkbox is unchecked during recording, webcam capture stops.
9. Click Stop Recording.
10. App saves files to videos/<uuid>/.
11. Click Open Session Folder to open the last completed recording folder.

## Output Format and Storage

Each recording session is stored in a new UUID folder:

```text
videos/
└── 4a12ffac-b243-4fa3-8c9f-1123dfeaa342/
    ├── screen.webm
    └── webcam.webm
```

Rules:
- screen.webm is created for every successful screen recording
- webcam.webm is created only if webcam recording ran during that session
- Files are intentionally not merged

## Edge Cases Handled

### Camera permission denied
- Webcam recording does not start
- Webcam checkbox is reset
- User gets clear alert message

### Screen permission denied
- Screen recording does not start
- User gets clear alert message

### No available sources
- UI shows fallback source text
- Start Recording is disabled until a valid source is available

### External stop of screen share/webcam
- If system/browser stops a media track, the app stops corresponding recorder gracefully

### App closed mid-recording
- Main process asks renderer to prepare close
- Renderer stops active recorders
- Buffered chunks are saved
- App closes after graceful shutdown (with timeout fallback)

## Scripts

Defined in package.json:
- npm start: starts Electron app
- npm run dev: starts Electron through nodemon for development

## Known Limitations

- Output is WebM only in current scope
- Audio from screen/system is not captured
- Webcam and screen are saved separately (no final merged video)
- ffmpeg-static is installed but not used in this assignment-scope version

## Troubleshooting

### App does not list screens/windows
- Click Load Screens again
- Check OS-level screen capture permissions
- Restart the app after changing permission settings

### Webcam not recording
- Ensure screen recording is active
- Ensure webcam checkbox is enabled
- Allow camera permission when prompted

### App closes while recording
- Current build uses graceful close handling
- If forced termination occurs, last partial recording may be incomplete

## Security Notes

- contextIsolation is enabled
- Renderer only accesses whitelisted IPC methods exposed by preload.js

## Author Notes

This project intentionally prioritizes assignment-required functionality and clean minimal implementation over optional feature expansion Thank you 
Balram Prajapati 😊.
