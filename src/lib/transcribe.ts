import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import { execFile } from "child_process";
import { fetchWithTlsFallback } from "@/lib/llm";

const execFileAsync = promisify(execFile);

// Resolve the ffmpeg binary. `require.resolve` gets mangled by the Next bundler,
// so locate it relative to the project root (ffmpeg-static installs to node_modules).
function resolveFfmpeg(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const candidates = [
    path.join(process.cwd(), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    "ffmpeg not found. Install it with: npm install ffmpeg-static (or set FFMPEG_PATH to an existing ffmpeg binary)."
  );
}

const FFMPEG_PATH = resolveFfmpeg();

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function getWhisperModel(): string {
  return process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";
}

// Formats Groq's audio transcription endpoint accepts natively.
const AUDIO_PASSTHROUGH = new Set([
  "mp3", "m4a", "mp4", "mpeg", "mpga", "ogg", "wav", "flac", "webm",
]);

// The user asked for video; these need the audio track pulled out first.
const VIDEO_TYPES = new Set([
  "mp4", "mov", "mkv", "avi", "flv", "m4v", "webm", "ts", "3gp", "mpeg", "mpg", "wmv",
]);

const MAX_FILE_BYTES = 25 * 1024 * 1024; // Groq Whisper 25 MB limit

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot + 1).toLowerCase();
}

interface SttResult {
  text: string;
  format: "audio" | "video";
}

/**
 * Transcribe an audio or video file using Groq's Whisper speech-to-text.
 * Video files are pre-processed with ffmpeg to extract just their audio track.
 */
export async function transcribeMedia(
  buffer: Buffer,
  originalName: string
): Promise<SttResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env.local (see README)."
    );
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("File too large. Groq Whisper accepts files up to 25 MB.");
  }

  const ext = getExtension(originalName);
  const isVideo = VIDEO_TYPES.has(ext);
  const isAudioPassthrough = AUDIO_PASSTHROUGH.has(ext);

  const tmpDir = path.join(os.tmpdir(), "nova-transcribe");
  fs.mkdirSync(tmpDir, { recursive: true });

  const inputPath = path.join(tmpDir, `input_${Date.now()}.${ext || "bin"}`);
  const mp3Path = path.join(tmpDir, `output_${Date.now()}.mp3`);
  let converted: Buffer | null = null;

  fs.writeFileSync(inputPath, buffer);

  try {
    if (isVideo) {
      // Extract audio track (drop video stream) and normalize to mono 16 kHz mp3.
      await execFileAsync(
        FFMPEG_PATH,
        ["-y", "-i", inputPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k", mp3Path],
        { windowsHide: true }
      );
      converted = fs.readFileSync(mp3Path);
      if (!converted || converted.length < 18) {
        throw new Error("No audio track found in the video file.");
      }
    } else if (!isAudioPassthrough) {
      // Unsupported audio container - convert to mp3 first.
      await execFileAsync(
        FFMPEG_PATH,
        ["-y", "-i", inputPath, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "64k", mp3Path],
        { windowsHide: true }
      );
      converted = fs.readFileSync(mp3Path);
    }

    const audio = converted ?? buffer;
    const filename = converted ? "audio.mp3" : `audio.${ext}`;
    const mime = converted
      ? "audio/mpeg"
      : ext === "webm"
        ? "audio/webm"
        : ext === "ogg"
          ? "audio/ogg"
          : ext === "wav"
            ? "audio/wav"
            : ext === "flac"
              ? "audio/flac"
              : "audio/mpeg";

    // Align the byte buffer with the web Blob type accepted by global FormData.
    const audioBytes = new Uint8Array(audio.byteLength);
    audioBytes.set(audio);

    const form = new FormData();
    form.append("model", getWhisperModel());
    form.append("file", new Blob([audioBytes], { type: mime }), filename);
    form.append("response_format", "json");

    const res = await fetchWithTlsFallback(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Whisper transcription failed (${res.status}): ${body || res.statusText}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as { text?: string };
    const text = (data.text ?? "").trim();
    if (!text) throw new Error("Whisper returned an empty transcript.");

    return { text, format: isVideo ? "video" : "audio" };
  } finally {
    for (const f of [inputPath, mp3Path]) {
      try {
        fs.unlinkSync(f);
      } catch {
        // already gone
      }
    }
  }
}