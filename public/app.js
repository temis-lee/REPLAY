const video = document.getElementById("video");
const videoWrap = document.getElementById("videoWrap");
const controls = document.getElementById("controls");
const centerControl = document.getElementById("centerControl");
const centerIcon = document.getElementById("centerIcon");
const play = document.getElementById("play");
const back10 = document.getElementById("back10");
const forward10 = document.getElementById("forward10");
const mute = document.getElementById("mute");
const volume = document.getElementById("volume");
const speed = document.getElementById("speed");
const pip = document.getElementById("pip");
const fullscreen = document.getElementById("fullscreen");
const scrubber = document.getElementById("scrubber");
const played = document.getElementById("played");
const buffered = document.getElementById("buffered");
const thumb = document.querySelector(".scrubber-thumb");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const playlist = document.getElementById("playlist");
const refresh = document.getElementById("refresh");
const status = document.getElementById("status");
const toast = document.getElementById("toast");
const gestureIndicator = document.getElementById("gestureIndicator");
const libraryTitle = document.getElementById("libraryTitle");
const librarySubtitle = document.getElementById("librarySubtitle");

let mode = "local";
let items = [];
let currentIndex = -1;
let hideTimer;
let speedIndex = 0;
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  const m = Math.floor(value / 60);
  const s = Math.floor(value % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 900);
}

function showGesture(message) {
  gestureIndicator.textContent = message;
  gestureIndicator.classList.add("show");
  clearTimeout(showGesture.timer);
  showGesture.timer = setTimeout(() => gestureIndicator.classList.remove("show"), 500);
}

function resetHideTimer() {
  controls.classList.remove("hidden");
  clearTimeout(hideTimer);

  if (!video.paused) {
    hideTimer = setTimeout(() => {
      controls.classList.add("hidden");
    }, 2400);
  }
}

function togglePlay() {
  if (!video.src) {
    showToast("Choose a video first");
    return;
  }
  video.paused ? video.play() : video.pause();
  resetHideTimer();
}

play.onclick = togglePlay;
centerControl.onclick = togglePlay;

video.addEventListener("play", () => {
  play.textContent = "❚❚";
  centerIcon.textContent = "❚❚";
  centerControl.classList.add("hidden");
  resetHideTimer();
});

video.addEventListener("pause", () => {
  play.textContent = "▶";
  centerIcon.textContent = "▶";
  centerControl.classList.remove("hidden");
  controls.classList.remove("hidden");
  clearTimeout(hideTimer);
});

video.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(video.duration);
  const saved = getResumePosition();
  if (saved > 0 && saved < video.duration - 3) {
    video.currentTime = saved;
    showToast(`Resumed at ${formatTime(saved)}`);
  }
});

video.addEventListener("timeupdate", () => {
  if (!video.duration) return;
  const percent = (video.currentTime / video.duration) * 100;
  played.style.width = `${percent}%`;
  thumb.style.left = `${percent}%`;
  currentTime.textContent = formatTime(video.currentTime);

  if (currentIndex >= 0) {
    localStorage.setItem(resumeKey(items[currentIndex]), String(video.currentTime));
  }
});

video.addEventListener("progress", () => {
  if (!video.duration || !video.buffered.length) return;
  const end = video.buffered.end(video.buffered.length - 1);
  buffered.style.width = `${Math.min(100, (end / video.duration) * 100)}%`;
});

video.addEventListener("ended", () => {
  if (currentIndex < items.length - 1) loadVideo(currentIndex + 1);
});

function seekAt(clientX) {
  if (!video.duration) return;
  const rect = scrubber.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  video.currentTime = ratio * video.duration;
}

scrubber.addEventListener("pointerdown", e => {
  seekAt(e.clientX);
  scrubber.setPointerCapture(e.pointerId);
});

scrubber.addEventListener("pointermove", e => {
  if (e.buttons) seekAt(e.clientX);
});

back10.onclick = () => {
  video.currentTime = Math.max(0, video.currentTime - 10);
  showGesture("−10s");
  resetHideTimer();
};

forward10.onclick = () => {
  video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
  showGesture("+10s");
  resetHideTimer();
};

mute.onclick = () => {
  video.muted = !video.muted;
  mute.textContent = video.muted ? "🔇" : "🔊";
};

volume.oninput = () => {
  video.volume = Number(volume.value);
  video.muted = video.volume === 0;
  mute.textContent = video.muted ? "🔇" : "🔊";
};

speed.onclick = () => {
  speedIndex = (speedIndex + 1) % speeds.length;
  const value = speeds[speedIndex];
  video.playbackRate = value;
  speed.textContent = `${value}×`;
  showToast(`Playback ${value}×`);
};

pip.onclick = async () => {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    } else {
      showToast("Picture in Picture is unavailable");
    }
  } catch {
    showToast("Picture in Picture failed");
  }
};

fullscreen.onclick = async () => {
  try {
    if (!document.fullscreenElement) {
      await videoWrap.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    showToast("Fullscreen unavailable");
  }
};

videoWrap.addEventListener("mousemove", resetHideTimer);
videoWrap.addEventListener("touchstart", resetHideTimer, { passive: true });

video.addEventListener("click", e => {
  const rect = video.getBoundingClientRect();
  const x = e.clientX - rect.left;

  if (x < rect.width * 0.3) {
    video.currentTime = Math.max(0, video.currentTime - 10);
    showGesture("−10s");
  } else if (x > rect.width * 0.7) {
    video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
    showGesture("+10s");
  } else {
    togglePlay();
  }
});

document.addEventListener("keydown", e => {
  if (["INPUT", "BUTTON"].includes(document.activeElement.tagName)) return;

  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
  }

  if (e.key === "ArrowLeft") {
    video.currentTime = Math.max(0, video.currentTime - 5);
    showGesture("−5s");
  }

  if (e.key === "ArrowRight") {
    video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
    showGesture("+5s");
  }

  if (e.key.toLowerCase() === "m") mute.click();
  if (e.key.toLowerCase() === "f") fullscreen.click();
});

function resumeKey(item) {
  return `glass-player:${mode}:${item.id}`;
}

function getResumePosition() {
  if (currentIndex < 0) return 0;
  return Number(localStorage.getItem(resumeKey(items[currentIndex])) || 0);
}

function renderPlaylist() {
  playlist.innerHTML = "";

  items.forEach((item, index) => {
    const el = document.createElement("div");
    el.className = `item ${index === currentIndex ? "active" : ""}`;

    el.innerHTML = `
      <div class="item-name">${escapeHTML(item.name)}</div>
      <div class="item-source">${mode === "wlan" ? "WLAN library" : "This device"}</div>
    `;

    el.onclick = () => loadVideo(index);
    playlist.appendChild(el);
  });
}

function loadVideo(index) {
  const item = items[index];
  if (!item) return;

  currentIndex = index;
  video.src = item.url;
  video.load();
  renderPlaylist();
  video.play().catch(() => {});
}

function addLocalFiles(files) {
  const accepted = [...files].filter(file => file.type.startsWith("video/"));

  for (const file of accepted) {
    const id = `${file.name}:${file.size}:${file.lastModified}`;
    items.push({
      id,
      name: file.name,
      url: URL.createObjectURL(file)
    });
  }

  renderPlaylist();

  if (currentIndex === -1 && items.length) loadVideo(0);
}

fileInput.onchange = () => {
  addLocalFiles(fileInput.files);
  fileInput.value = "";
};

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  addLocalFiles(e.dataTransfer.files);
});

async function loadWlanLibrary() {
  status.textContent = "Connecting to WLAN library…";

  try {
    const response = await fetch("/api/videos", { cache: "no-store" });
    if (!response.ok) throw new Error();

    const files = await response.json();

    items = files.map(file => ({
      id: file.name,
      name: file.name,
      url: file.url
    }));

    currentIndex = -1;
    renderPlaylist();

    status.textContent = `${items.length} WLAN video${items.length === 1 ? "" : "s"}`;
    showToast(`${items.length} videos found`);
  } catch {
    items = [];
    currentIndex = -1;
    renderPlaylist();
    status.textContent = "WLAN library unavailable";
    showToast("Could not reach the media server");
  }
}

function setMode(nextMode) {
  mode = nextMode;

  document.querySelectorAll(".mode").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  video.pause();
  video.removeAttribute("src");
  video.load();

  items = [];
  currentIndex = -1;
  renderPlaylist();

  if (mode === "local") {
    libraryTitle.textContent = "Local Videos";
    librarySubtitle.textContent = "Choose videos from this device.";
    dropZone.style.display = "";
    fileInput.parentElement.style.display = "";
    refresh.style.display = "none";
    status.textContent = "Local mode";
  } else {
    libraryTitle.textContent = "WLAN Library";
    librarySubtitle.textContent = "Videos hosted by this computer.";
    dropZone.style.display = "none";
    fileInput.parentElement.style.display = "none";
    refresh.style.display = "";
    loadWlanLibrary();
  }
}

document.querySelectorAll(".mode").forEach(button => {
  button.onclick = () => setMode(button.dataset.mode);
});

refresh.onclick = loadWlanLibrary;

setMode("local");
