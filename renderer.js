let screenRecorder = null;
let webcamRecorder = null;
let screenChunks = [];
let webcamChunks = [];
let screenStreamRef = null;
let webcamStreamRef = null;

let isScreenRecording = false;
let isWebcamRecording = false;
let sessionActive = false;
let lastSessionDir = null;

let timerInterval = null;
let seconds = 0;
let hasSources = false;
let isClosing = false;

// Load screens
async function loadScreens() {
  const select = document.getElementById('screens');
  select.innerHTML = '';

  try {
    const sources = await window.api.getSources();
    hasSources = sources.length > 0;

    if (!hasSources) {
      const option = document.createElement('option');
      option.value = '';
      option.innerText = 'No screen/window source found';
      select.appendChild(option);
      updateButtons();
      return;
    }

    sources.forEach((source) => {
      const option = document.createElement('option');
      option.value = source.id;
      option.innerText = source.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load sources:', error);
    hasSources = false;
    const option = document.createElement('option');
    option.value = '';
    option.innerText = 'Unable to load sources';
    select.appendChild(option);
    alert('Unable to load screens/windows. Please try again.');
  }

  updateButtons();
}

function formatTime(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function updateTimerLabel() {
  document.getElementById('timer').innerText = formatTime(seconds);
}

function updateRecordingState(isActive) {
  const status = document.getElementById('recordingState');
  if (isActive) {
    status.innerText = 'Recording';
    status.classList.add('active');
    return;
  }

  status.innerText = 'Idle';
  status.classList.remove('active');
}

function startTimer() {
  if (timerInterval) {
    return;
  }

  updateTimerLabel();
  timerInterval = setInterval(() => {
    seconds += 1;
    updateTimerLabel();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

async function ensureSession() {
  if (sessionActive) {
    return;
  }

  await window.api.startSession();
  sessionActive = true;
}

async function closeSessionIfIdle() {
  if (isScreenRecording || isWebcamRecording || !sessionActive) {
    return;
  }

  lastSessionDir = await window.api.endSession();
  sessionActive = false;
}

function stopTracks(stream) {
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
}

function updateButtons() {
  document.getElementById('startScreen').disabled = isScreenRecording || !hasSources || isClosing;
  document.getElementById('stopScreen').disabled = !isScreenRecording;

  document.getElementById('openFolder').disabled = !lastSessionDir && !sessionActive;
}

async function startScreenRecording() {
  if (isScreenRecording) {
    return;
  }

  const sourceId = document.getElementById('screens').value;

  if (!sourceId) {
    alert('Please load and select a screen or window first.');
    return;
  }

  try {
    await ensureSession();
    screenChunks = [];

    const screenStream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      },
      audio: false
    });

    screenStreamRef = screenStream;
    const [screenTrack] = screenStream.getVideoTracks();
    if (screenTrack) {
      screenTrack.onended = () => {
        stopScreenRecording();
      };
    }

    screenRecorder = new MediaRecorder(screenStream);

    screenRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        screenChunks.push(e.data);
      }
    };

    screenRecorder.onstop = async () => {
      try {
        if (screenChunks.length > 0) {
          const blob = new Blob(screenChunks, { type: 'video/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          await window.api.saveVideo(new Uint8Array(arrayBuffer), 'screen');
        }
      } catch (error) {
        console.error('Failed to save screen recording:', error);
      } finally {
        isScreenRecording = false;
        screenRecorder = null;
        screenChunks = [];
        stopTimer();
        updateRecordingState(false);
        stopTracks(screenStreamRef);
        screenStreamRef = null;
        await closeSessionIfIdle();
        updateButtons();
      }
    };

    screenRecorder.start();
    isScreenRecording = true;
    seconds = 0;
    updateTimerLabel();
    startTimer();
    updateRecordingState(true);
    updateButtons();

    if (document.getElementById('webcamToggle').checked && !isWebcamRecording) {
      await startWebcamRecording();
    }
  } catch (error) {
    console.error('Failed to start screen recording:', error);
    if (error && error.name === 'NotAllowedError') {
      alert('Screen recording permission was denied. Please allow screen capture and try again.');
    } else {
      alert('Failed to start screen recording. Check permissions and try again.');
    }
    await closeSessionIfIdle();
    updateButtons();
  }
}

function stopScreenRecording() {
  if (!isScreenRecording || !screenRecorder || screenRecorder.state === 'inactive') {
    return;
  }

  if (isWebcamRecording && webcamRecorder && webcamRecorder.state !== 'inactive') {
    webcamRecorder.stop();
  }

  stopTimer();
  updateRecordingState(false);
  screenRecorder.stop();
}

async function startWebcamRecording() {
  if (isWebcamRecording) {
    return;
  }

  if (!isScreenRecording) {
    return;
  }

  const webcamEnabled = document.getElementById('webcamToggle').checked;
  if (!webcamEnabled) {
    return;
  }

  try {
    await ensureSession();
    webcamChunks = [];

    const webcamStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    webcamStreamRef = webcamStream;
    const [webcamTrack] = webcamStream.getVideoTracks();
    if (webcamTrack) {
      webcamTrack.onended = () => {
        stopWebcamRecording();
      };
    }

    webcamRecorder = new MediaRecorder(webcamStream);

    webcamRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        webcamChunks.push(e.data);
      }
    };

    webcamRecorder.onstop = async () => {
      try {
        if (webcamChunks.length > 0) {
          const blob = new Blob(webcamChunks, { type: 'video/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          await window.api.saveVideo(new Uint8Array(arrayBuffer), 'webcam');
        }
      } catch (error) {
        console.error('Failed to save webcam recording:', error);
      } finally {
        isWebcamRecording = false;
        webcamRecorder = null;
        webcamChunks = [];
        stopTracks(webcamStreamRef);
        webcamStreamRef = null;
        await closeSessionIfIdle();
        updateButtons();
      }
    };

    webcamRecorder.start();
    isWebcamRecording = true;
    updateButtons();
  } catch (error) {
    console.error('Failed to start webcam recording:', error);
    if (error && error.name === 'NotAllowedError') {
      document.getElementById('webcamToggle').checked = false;
      alert('Camera permission was denied. Webcam recording has been disabled.');
    } else {
      alert('Failed to start webcam recording. Check camera permissions and try again.');
    }
    await closeSessionIfIdle();
    updateButtons();
  }
}

function stopWebcamRecording() {
  if (!isWebcamRecording || !webcamRecorder || webcamRecorder.state === 'inactive') {
    return;
  }

  webcamRecorder.stop();
}

// Open folder
function openFolder() {
  const target = lastSessionDir;
  if (!target) {
    alert('No completed recording session is available yet.');
    return;
  }

  window.api.openFolder(target);
}

function waitForRecordersToStop(timeoutMs) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      if (!isScreenRecording && !isWebcamRecording) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve();
        return;
      }

      setTimeout(check, 100);
    };

    check();
  });
}

async function prepareClose() {
  if (isClosing) {
    return;
  }

  isClosing = true;
  updateButtons();

  if (isWebcamRecording) {
    stopWebcamRecording();
  }

  if (isScreenRecording) {
    stopScreenRecording();
  }

  await waitForRecordersToStop(4500);
  await window.api.rendererReadyToClose();
}

async function handleWebcamToggle() {
  const webcamEnabled = document.getElementById('webcamToggle').checked;
  if (!isScreenRecording) {
    updateButtons();
    return;
  }

  if (webcamEnabled && !isWebcamRecording) {
    await startWebcamRecording();
  }

  if (!webcamEnabled && isWebcamRecording) {
    stopWebcamRecording();
  }

  updateButtons();
}

// Event bindings
document.getElementById('load').onclick = loadScreens;
document.getElementById('startScreen').onclick = startScreenRecording;
document.getElementById('stopScreen').onclick = stopScreenRecording;
document.getElementById('webcamToggle').onchange = handleWebcamToggle;
document.getElementById('openFolder').onclick = openFolder;
window.api.onPrepareClose(prepareClose);

window.addEventListener('beforeunload', () => {
  stopTracks(screenStreamRef);
  stopTracks(webcamStreamRef);
});

loadScreens();
updateTimerLabel();
updateRecordingState(false);
updateButtons();