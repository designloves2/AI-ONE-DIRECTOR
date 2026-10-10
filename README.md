# AI ONE DIRECTOR

**Autonomous AI Video Director MCP Server & Production Pipeline**

AI ONE DIRECTOR transforms a high-level creative brief into a fully finished, high-resolution commercial or narrative video autonomously:
`Brief -> Scenario & Shot List -> Reference Images -> Video Generation (7+1 Turbo) -> One-Look Review -> Retries / Adoption -> Stitching & Concat -> Korean Typography Overlay -> Final Report`.

Built for local GPU execution with persistent remote MCP server access over Cloudflare tunnels, strict token economy, and zero user approval bottlenecks during production.

---

## Key Highlights

- **Token Economy (Top Priority)**:
  - **One-look review**: Visual verdict (`PASS`/`FAIL`) + single-line failure reason.
  - **Single lightweight grid image**: FFmpeg extracts 4-6 representative frames into one 2x2 grid image per attempt, eliminating excessive multimodal token costs.
  - **Cheap numeric checks first**: ffprobe & ffmpeg inspect duration, resolution, freeze, and blackout before vision models ever view frames.
  - **State persisted in files**: Everything tracked in `project.json` and `clips/clipNN/review.json`.
- **Production Standard**:
  - **MiniMax H3 7+1 Default**: 7 turbo steps at 0.5 MP, latent upscale, 1 refinement step at 1.6 MP (1696x960 16:9).
  - **Korean Typography**: Overlaid via FFmpeg using system font (`malgun.ttf`). Video diffusion models are never tasked with drawing Hangul text.
  - **Product Match Guarantee**: Side-by-side reference verification with instant-fail enforcement.
  - **Automatic Adoption**: Up to 3 attempts per shot; adopts best scoring attempt if retry limit is reached.
- **Unified MCP Server**:
  - Supports both **Streamable HTTP SSE** (`http://localhost:3210/sse`) and **Stdio** transports.
  - Bearer token authentication, path locking, and single-GPU concurrency mutex.

---

## System Architecture

```
C:\AI\AI_One_Director/
├── comfy.json                  # ComfyUI backend endpoint (http://127.0.0.1:8188)
├── start-director.bat          # Auto-restarting Windows launcher
├── start-director-background.vbs # Silent background launcher
├── headless/                   # Zero-dependency generation modules (copied from AI-ONE-STUDIO)
│   ├── h3-headless/            # MiniMax H3 (ref2va, fl2va, l2va, t2va, onetake)
│   ├── krea2-headless/         # Krea2 (t2i, i2i, identity)
│   ├── qwen21-headless/        # Qwen Image 2.1 (t2i, i2i, ref2i, edit, pose)
│   ├── zimage-headless/        # Z-Image Turbo
│   ├── klein-headless/         # Flux2 Klein
│   ├── video-rtx-headless/     # RTX Video Super Resolution / Deblur
│   ├── music-headless/         # MusicMaker (AceStep / MiniMax)
│   └── upscale-headless/       # SeedVR2 upscale
├── src/
│   ├── server.mjs              # MCP Server (SSE & Stdio, CORS, Token Auth)
│   ├── tools.mjs               # 18 MCP tool definitions with Zod schemas
│   ├── resources.mjs           # MCP resources for director rules and rubrics
│   ├── media.mjs               # FFmpeg probing, grid extraction, concat, text overlay
│   ├── stt.mjs                 # Whisper STT speech verification wrapper
│   ├── whisper_transcribe.py   # Python Whisper transcription script
│   ├── generators.mjs          # GPU-locked wrappers for headless modules
│   ├── projects.mjs            # Project folder structure & state management
│   └── security.mjs            # Token validation & path sanitization
├── skills/
│   ├── director-core.md        # Core director rules & autonomous workflow
│   ├── rubric.md               # 10-point scoring rubric & instant fail rules
│   └── genres/
│       ├── ad.md               # Commercial / product ad profile
│       ├── short-drama.md      # Narrative drama profile
│       └── vlog.md             # 9:16 short-form & rhythm profile
└── projects/                   # Generated projects and artifacts
```

---

## Exposed MCP Tools

| Tool | Category | Description |
|---|---|---|
| `project_init` | Lifecycle | Initialize project directory with brief and initial state |
| `project_status` | Lifecycle | Query current project stage, shot progress, and clip verdicts |
| `project_save_scenario` | Pre-prod | Save shot list table (purpose, duration, prompts, refs) |
| `generate_image_krea2` | Image Gen | Generate reference or concept images with Krea2 |
| `generate_image_qwen21` | Image Gen | Generate reference images with Qwen Image 2.1 |
| `generate_image_zimage` | Image Gen | Fast generation via Z-Image Turbo |
| `generate_image_klein` | Image Gen | Flux2 Klein generation, inpaint, or faceswap |
| `generate_image_upscale` | Image Gen | Upscale still images via SeedVR2 |
| `generate_video_h3` | Video Gen | MiniMax H3 video clip generation (7+1 1.6MP default) |
| `generate_video_rtx` | Video Post | Upscale or deblur video clips using NVIDIA RTX VSR |
| `generate_music` | Audio Gen | Generate background music or songs (AceStep / MiniMax) |
| `media_quality_check` | Media Tool | Cheap numeric quality filter (resolution, freeze, blackout) |
| `media_extract_grid` | Media Tool | Extract representative frames into ONE lightweight 2x2 grid |
| `stt_verify` | Audio Tool | Whisper STT transcript check against dialogue script |
| `record_review_verdict` | Review | Record PASS/FAIL/ADOPT verdict + single-line reason |
| `media_concat_clips` | Assembly | Lossless FFmpeg concatenation of approved clips |
| `media_text_overlay` | Assembly | Clean Korean typography / subtitle overlay with system font |
| `project_save_report` | Delivery | Store final markdown report and mark project completed |

---

## MCP Resources

Clients can read the operational rules and profiles directly:
- `director://skills/core`: Core director rules and token economy guidelines
- `director://skills/rubric`: Complete 10-point scoring rubric and instant-fail rules
- `director://skills/genres/ad`: Commercial ad structure and product fidelity rules
- `director://skills/genres/drama`: Narrative drama structure and character consistency rules
- `director://skills/genres/vlog`: 9:16 short-form rhythm and typography rules

---

## Quick Start

### 1. Requirements
- Windows 10/11 with NVIDIA GPU (16GB+ VRAM recommended)
- Node.js 20+
- FFmpeg in system PATH
- ComfyUI running at `http://127.0.0.1:8188` (with `ComfyUI-TJ_NODE_STUDIO_ONE` nodes)
- Python embedded environment (`C:\AI\ComfyUI-Easy-Install\python_embeded`) with `openai-whisper`

### 2. Running the Server
```bash
# Start MCP server directly
node src/server.mjs

# Or use the Windows launcher
start-director.bat
```

By default, the server listens on `http://0.0.0.0:3210`.  
SSE endpoint: `http://localhost:3210/sse`  
Health check: `http://localhost:3210/health`

---

## Verified End-to-End Test

The complete pipeline was verified with a real production run (`projects/energy_drink_ad`):
1. **Reference Generation**: Krea2 generated neon energy drink can reference (`K2_00422_.png`) in 43.7s.
2. **Shot 1 Generation**: H3 7+1 (0.5MP -> 1.6MP, 1696x960, 5.17s) rendered in 214s -> Numeric quality PASS -> Visual review 10/10 PASS.
3. **Shot 2 Generation**: H3 7+1 hero pullback (1696x960, 5.17s) rendered in 207s -> Numeric quality PASS -> Visual review 10/10 PASS.
4. **Assembly**: Concat into 10.37s video + 2-stage Korean typography overlay ("잠든 에너지를 깨우다", "한계를 뛰어넘는 짜릿함") -> Final commercial video delivered.
