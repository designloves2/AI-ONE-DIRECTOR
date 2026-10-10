# AI ONE DIRECTOR

**Autonomous AI Video Director MCP Server & Production Pipeline**

AI ONE DIRECTOR transforms a high-level creative brief into a fully finished, high-resolution commercial or narrative video autonomously:
`Brief -> Scenario & Dynamic Shot Planning -> Reference Asset Pool (Krea2 Default) -> Video Generation (H3 7+1 Turbo) -> One-Look Review & Face Auto-Refine -> Retries / Adoption -> Stitching & Concat -> Korean Typography Overlay -> Final Report`.

Built for local GPU execution with persistent remote MCP server access over Cloudflare tunnels, strict token economy, and zero user approval bottlenecks during production.

---

## 📋 Prerequisites & Requirements (사용 조건 및 필수 환경)

AI ONE DIRECTOR is an autonomous orchestration layer that communicates with an active **ComfyUI backend engine**. To use all features, the following software, custom node packs, and dependencies must be configured:

### 1. ComfyUI Server & Core Custom Nodes
* **ComfyUI Server**: Running at `http://127.0.0.1:8188` (or accessible via Cloudflare tunnel `https://comfy.tjtj.cloud`).
* **[`ComfyUI-TJ_NODE`](https://github.com/designloves2/ComfyUI-TJ_NODE)** (**FOUNDATIONAL BASE NODE / 필수 기반 베이스 노드**):
  - **The fundamental base node for the entire ecosystem.** Provides the core wireless routing architecture, memory optimization engines, base utilities, and shared reference asset library (`/tj_node/reflib`).
  - ⚠️ **`ComfyUI-TJ_NODE` must be installed first — `ComfyUI-TJ_NODE_STUDIO_ONE` directly depends on it and cannot function without it.**
* **[`ComfyUI-TJ_NODE_STUDIO_ONE`](https://github.com/designloves2/ComfyUI-TJ_NODE_STUDIO_ONE)** (**MANDATORY ALL-IN-ONE STUDIO NODE**):
  - Built on top of `ComfyUI-TJ_NODE`. Provides the underlying all-in-one studio graph builders and configuration REST endpoints (`/minimax_h3_one/config`, `/krea2_one/config`, `/qwenimage21_one/config`, etc.).
* **Optional Companion Web UI**:
  - **[`AI-ONE-STUDIO`](https://github.com/designloves2/AI-ONE-STUDIO)**: Standalone web studio for manual interactive generation, asset inspection, and prompt tuning.

---

### 2. Model-Specific Custom Node Dependencies

| Feature / Model | Required ComfyUI Custom Nodes | Purpose |
|---|---|---|
| 🎬 **MiniMax H3 Video** | • `ComfyUI-MiniMaxH3_LatentUpscaler`<br>• `ComfyUI-sol-attn` or `ComfyUI-SolAttn_triton`<br>• `minimax-h3-firstblockcache`<br>• `ComfyUI-H3-NativeAudioLock`<br>• `ComfyUI-FlashVSR_Ultra_Fast`<br>• `H3-Optimizations` | 7+1 Latent Upscale (0.5MP -> 1.6MP), Fused Attention acceleration, FirstBlockCache, and Native Audio Locking. |
| 👤 **H3 Face Refine** | • `ComfyUI-H3-FaceRefine`<br>• `face_yolov8m.pt` (in `models/yolo` or `models/detection`) | Automated facial tracking, 768x768 cropping, latent re-rendering, and seamless stitching for small/distant faces. |
| 🖼 **Krea 2 (Default)** | • `comfyui-krea2edit`<br>• `comfyui-krea2-controlnet`<br>• `ComfyUI-Krea2T-Enhancer` | Primary default engine for Reference Asset Pool, T2I, I2I, and Identity generation. |
| 🖼 **Qwen Image 2.1** | • `comfyui-qwenmultiangle`<br>• `ComfyUI-QwenVL`<br>• `ComfyUI-SAM3DBody` | Multi-angle editing, Ref2Image, and 2-stage character pose transfer (SAM3D Body). |
| 🖼 **Flux.2 Klein** | • `ComfyUI-Flux2Klein-Enhancer`<br>• `ComfyUI-nunchaku` | 4-step/base Klein T2I, I2I, inpaint, outpaint, and faceswap. |
| 🖼 **Z-Image Turbo** | • `ComfyUI-Impact-Pack`<br>• `ComfyUI-KJNodes` | Fast 8-step SDXL-Turbo / AuraFlow generation. |
| 🎵 **MusicMaker** | • `JK-AceStep-Nodes`<br>• `ComfyUI-YuE2` | Ace-Step 1.5 and MiniMax Music 3 / YuE2 soundtrack generation. |
| 🔍 **Upscale & RTX** | • `seedvr2_videoupscaler`<br>• `comfyui_nvidia_rtx_nodes` | SeedVR2 still upscale and NVIDIA RTX Video Super Resolution (VSR) / Deblur. |
| 🛠 **Media Utilities** | • `comfyui-videohelpersuite` (VHS)<br>• `rgthree-comfy`<br>• `comfyui-kjnodes` | Video loading, batching, combining, and latent manipulation. |

---

### 3. System & Binary Dependencies
* **Operating System**: Windows 10/11 (or Linux) with an NVIDIA GPU (**16GB+ VRAM** recommended for MiniMax H3 7+1 hi-res rendering).
* **Node.js**: **v20+** (Required to run the AI ONE DIRECTOR MCP server and zero-dependency headless modules).
* **FFmpeg & FFprobe**: Must be installed and registered in system `PATH` (used for frame grid extraction, numeric quality inspection, lossless concat, and Korean typography overlays).
* **Python & Whisper**: Python 3.10+ environment (such as `ComfyUI-Easy-Install\python_embeded`) with `openai-whisper` installed for STT dialogue/script verification.

---

### 4. Required Model Weights
Ensure the corresponding model checkpoints are downloaded to your ComfyUI `models/` directory:
* **MiniMax H3**: UNet (`MinimaxH3/...`), VAEs (`minimax_h3_video_vae_int8_convrot.safetensors`, `minimax_h3_audio_vae_fp32.safetensors`), Text Encoder (`qwen3vl_32b_heretic_minimax_h3_nvfp4.safetensors`), Turbo LoRA (`MiniMax-H3-*-Acc-8Step*.safetensors`), Latent Upscaler (`minimax_h3_latent_upscaler_3d_bf16.safetensors`).
* **Krea 2**: UNet (`Krea2/...`), Text Encoder (`qwen_3vl_4b_bf16.safetensors`), VAE (`qwen_image_vae.safetensors`).
* **Qwen Image 2.1**: Model (`QwenImage21/...`), Text Encoder (`qwen3vl_8b_int8_convrot.safetensors`), VAE (`qwen_image_2.1_vae_bf16.safetensors`).
* **Face Detection**: `face_yolov8m.pt` (in `models/yolo` or `models/detection`).

---

## 🚀 Key Highlights & Architecture

- **Token Economy (Top Priority)**:
  - **One-look review**: Visual verdict (`PASS`/`FAIL`) + single-line failure reason.
  - **Single lightweight grid image**: FFmpeg extracts 4-6 representative frames into one 2x2 grid image per attempt, eliminating excessive multimodal token costs.
  - **Cheap numeric checks first**: ffprobe & ffmpeg inspect duration, resolution, freeze, and blackout before vision models ever view frames.
  - **State persisted in files**: Everything tracked in `project.json` and `clips/clipNN/review.json`.
- **Reference Asset Pool (Krea2 Default)**:
  - Pre-generates an asset pool (3~6 images: product angles, character expressions, props) with Krea2 up front.
  - Selectively maps 1~3 relevant references per shot, ensuring cross-shot consistency without clutter.
- **Dynamic Pacing (Never 10s x 3)**:
  - Banned uniform division. Uses beat-driven variable shot lengths: Hook (3~5s), Macro Sizzle (6~9s), Reaction (3~5s), Lifestyle (5~8s), Hero Ending (4~6s).
- **Small Face Auto-Refine Protocol**:
  - Detects small face pixel smudging in wide/full shots and automatically restores faces with `enhance_face_refine` (768x768 crop & stitch) without regenerating the whole clip.
- **Natural Spoken Korean & Rich Voice Profiling**:
  - Replaces stiff brochure copy with living conversational dialogue (`<d>[Korean]...</d>`) and multi-dimensional voice actor descriptions `(S1)`.
- **Korean Typography**: Overlaid via FFmpeg using system font (`malgun.ttf`). Video diffusion models are never tasked with drawing Hangul text.

---

## 🛠 Exposed MCP Tools (19 Tools)

| Tool | Category | Description |
|---|---|---|
| `project_init` | Lifecycle | Initialize project directory with brief and initial state |
| `project_status` | Lifecycle | Query current project stage, shot progress, and clip verdicts |
| `project_save_scenario` | Pre-prod | Save shot list table (purpose, duration, prompts, refs) |
| `generate_image_krea2` | Image Gen | Generate reference or concept images with Krea2 (Default Engine) |
| `generate_image_qwen21` | Image Gen | Generate reference images with Qwen Image 2.1 |
| `generate_image_zimage` | Image Gen | Fast generation via Z-Image Turbo |
| `generate_image_klein` | Image Gen | Flux2 Klein generation, inpaint, or faceswap |
| `generate_image_upscale` | Image Gen | Upscale still images via SeedVR2 |
| `generate_video_h3` | Video Gen | MiniMax H3 video clip generation (7+1 1.6MP default) |
| `generate_video_rtx` | Video Post | Upscale or deblur video clips using NVIDIA RTX VSR |
| `enhance_face_refine` | Video Post | Track and restore small/smudged faces via H3 Face Refine (768x768 crop & stitch) |
| `generate_music` | Audio Gen | Generate background music or songs (AceStep / MiniMax) |
| `media_quality_check` | Media Tool | Cheap numeric quality filter (resolution, freeze, blackout) |
| `media_extract_grid` | Media Tool | Extract representative frames into ONE lightweight 2x2 grid |
| `stt_verify` | Audio Tool | Whisper STT transcript check against dialogue script |
| `record_review_verdict` | Review | Record PASS/FAIL/ADOPT verdict + single-line reason |
| `media_concat_clips` | Assembly | Lossless FFmpeg concatenation of approved clips |
| `media_text_overlay` | Assembly | Clean Korean typography / subtitle overlay with system font |
| `project_save_report` | Delivery | Store final markdown report and mark project completed |

---

## 📚 MCP Resources

Clients (Claude Desktop, Claude Code, Cursor, Codex) can read the operational rules and prompt guides directly:
- `director://skills/core`: Core director rules, token economy, and production workflow
- `director://skills/prompts`: Canonical prompt rules summary (H3 3-field schema & `<d>[Korean]...</d>` markup)
- `director://skills/prompts/krea2`: Official Krea 2 8-layer natural language prompt guide
- `director://skills/prompts/h3-base`: Official MiniMax H3 Video Prompt Guide (T2VA / I2VA / FL2VA / L2VA)
- `director://skills/prompts/h3-ref`: Official MiniMax H3 Ref2VA 6-section guide
- `director://skills/prompts/qwen21`: Official Qwen Image 2.1 prompt guide
- `director://skills/rubric`: Complete 10-point scoring rubric, instant fail rules, and Face Refine protocol
- `director://skills/genres/ad`: Commercial ad structure, asset pool mapping, and product fidelity rules
- `director://skills/genres/drama`: Narrative drama structure and character consistency rules
- `director://skills/genres/vlog`: 9:16 short-form rhythm, spoken dialogue, and typography rules

---

## 🏃 Quick Start

### 1. Running the Server Locally
```bash
# Start MCP server directly
node src/server.mjs

# Or use the Windows launcher
start-director.bat
```

By default, the server listens on `http://0.0.0.0:3210`.  
SSE endpoint: `http://localhost:3210/sse`  
Health check: `http://localhost:3210/health`

### 2. Connecting Remote Agents (Claude Desktop / Cursor / Codex)
Add to your client configuration (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "ai-one-director": {
      "url": "https://director.tjtj.cloud/sse",
      "headers": {
        "Authorization": "Bearer aione-director-secret-token-2026"
      }
    }
  }
}
```
*(If Cloudflare Access Zero Trust is enabled on the tunnel, include `CF-Access-Client-Id` and `CF-Access-Client-Secret` headers).*
