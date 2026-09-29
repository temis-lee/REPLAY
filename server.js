const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const VIDEO_DIR = path.join(__dirname, "videos");

app.use(express.static(path.join(__dirname, "public")));

const allowedExtensions = new Set([
  ".mp4", ".webm", ".ogg", ".mov", ".m4v", ".mkv"
]);

const mimeTypes = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".mkv": "video/x-matroska"
};

function safeName(name) {
  return path.basename(name);
}

app.get("/api/videos", async (req, res) => {
  try {
    const files = await fs.promises.readdir(VIDEO_DIR, { withFileTypes: true });

    const videos = files
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(name => allowedExtensions.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    res.json(videos.map(name => ({
      name,
      url: `/stream/${encodeURIComponent(name)}`
    })));
  } catch {
    res.status(500).json({ error: "Unable to read video library." });
  }
});

app.get("/stream/:name", async (req, res) => {
  const name = safeName(decodeURIComponent(req.params.name));
  const ext = path.extname(name).toLowerCase();

  if (!allowedExtensions.has(ext)) {
    return res.status(400).send("Unsupported video type.");
  }

  const filePath = path.join(VIDEO_DIR, name);

  try {
    const stat = await fs.promises.stat(filePath);

    if (!stat.isFile()) {
      return res.sendStatus(404);
    }

    const size = stat.size;
    const range = req.headers.range;
    const contentType = mimeTypes[ext] || "application/octet-stream";

    if (!range) {
      res.writeHead(200, {
        "Content-Length": size,
        "Content-Type": contentType,
        "Accept-Ranges": "bytes"
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    const match = range.match(/bytes=(\d*)-(\d*)/);

    if (!match) {
      return res.status(416).set("Content-Range", `bytes */${size}`).end();
    }

    const start = match[1] ? Number(match[1]) : 0;
    const requestedEnd = match[2] ? Number(match[2]) : size - 1;
    const end = Math.min(requestedEnd, size - 1);

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      start >= size ||
      start > end
    ) {
      return res.status(416).set("Content-Range", `bytes */${size}`).end();
    }

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": contentType
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } catch {
    res.sendStatus(404);
  }
});

// Express 5 no longer accepts "*" as an unnamed route parameter.
// Keep this last so API and streaming routes above are handled first.
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Glass Player running on port ${PORT}`);
  console.log(`Put videos in: ${VIDEO_DIR}`);
});
