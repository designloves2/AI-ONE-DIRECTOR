# HANDOFF — AI ONE DIRECTOR (read this first, then start at "Build order")

Owner: single user (personal use, not distributed). Chat in Korean, code / docs / UI strings in English. Reports to the
user: plain Korean (done / not done / works / doesn't work), no hashes or jargon in the main text.
The owner designed this in a long conversation in the `AI_One_Studio` session; everything below is DECIDED. Do not re-ask
the owner for decisions listed here. Do not start building until the owner says to start.

## Goal
The owner throws a short **brief** at Claude (e.g. "30s drink ad, product image attached, Korean narration + typography,
make it perfect"). Claude then acts as the director, alone, end to end: scenario -> shot list -> reference images ->
video clips -> review -> regenerate on fail -> next clip -> audio/video sync + edit -> stitch -> final report.
Every generated file is kept separately. Genres: ads, short drama, short-form / vlog, others later.
**No user approval step anywhere inside the finished system** — Claude decides pass / fail / retry / adopt / report.

## NON-NEGOTIABLE: token economy (top priority)
- Review is **one look, one verdict**. Output only PASS/FAIL per item + one-line fail reason ("frame N: X is wrong").
  No "unsure / re-check" verdict. If a fail reason can't be written in one line -> PASS.
- Never re-review a clip that passed; never reopen a passed clip when stitching shows a flaw (just note it in the report).
  A failed clip is regenerated, and the NEW file gets exactly one review.
- Fixed review inputs (frame count, size, grid). No "let me look closer" extra frames.
- Cheap checks first, by script (ffprobe/ffmpeg/STT): resolution, duration, sharpness, flicker, silence, transcript vs
  script. Fail there -> regenerate WITHOUT showing anything to Claude. Only clips that pass the numbers get frames shown,
  as ONE small grid image.
- Tools return tiny results `{ok, path, key numbers}`; details go to files, read only when needed. No full graphs or logs
  in results. Don't poll status in a loop — wait for a completion signal.
- State lives in files (`project.json`, `clips/clipNN/review.json`), not in the conversation. Per-clip work in a
  sub-agent that returns one summary line + paths. Mechanical steps on the lightest model; scenario and verdict on Opus.
  Review should be done by a separate Opus sub-agent (the generator must not grade itself).
- Regeneration: put the one-line fail reason into the prompt and resubmit immediately; no long root-cause analysis.
- Keep the director skill short (one-page core rules; genre profiles and rubric details in separate files read on demand).

## Review rubric (decided)
- Instant fail (any one): product shape/color/logo differs from reference; in-video text broken/misspelled; hands/body
  badly deformed; clip cut/corrupt; a core prompt element missing; speech differs from script; objective quality below
  threshold (resolution, sharpness, flicker).
- Scored 0-2 each: prompt adherence (list prompt elements, mark present/absent), motion naturalness, continuity with the
  previous clip (last frame vs first frame), audio clarity, ad/scene quality. Pass = no instant fail and total >= cutoff.
- Product match is strict on shape + color + logo (reference compared side by side).
- Retries: max 3 per clip. After 3 fails, ADOPT the best-scoring attempt, keep going, flag it in the final report with the
  reason. Never stop to ask. Only stop on the global budget cap (total attempts / time); then still write the report.
- Every verdict stored in `clips/clipNN/review.json`: scores, evidence (which frame), frames used.
- Be honest in the report about what frame-based review cannot verify (fine motion, lip sync).

## Text / typography
Do NOT make the video model draw ad copy, subtitles or Korean typography (it breaks Hangul). Overlay them in the edit step
with ffmpeg. In-video text that is reviewed = only text that already exists in the reference (e.g. package logo).

## Video rules (local backend, one GPU, clips run one after another)
- Default method: **7+1** (7 turbo steps at Start MP, latent upscale, 1 step at Final MP), **0.5 MP -> 1.6 MP**.
  Sweet spot = a **10 s** clip; each clip is 5-10 s depending on the shot. Defaults live in the MCP video tool; Claude may
  override for a shot, but default is the norm. Portrait (9:16) = same MP, only aspect changes.
- **Shots come from the scenario, never from dividing the total length.** Decide the shots first, then each shot's length
  (5-10 s) for what that shot needs; write one line "why this length" per shot. 10 s x 3 is fine if the scenario produces
  it; length-first slicing is not. Examples (both valid): intro 5 / main 10 / copy 5 / person 5 / ending 5; or intro 10 /
  narration 5 / product explanation 10 / ending 5. Total length is fitted in the edit step, not by padding shots.
- Shot list = the single artifact of the scenario step. Per shot: purpose, length (+why), scene, needed reference images,
  narration/dialogue, music yes/no. Every later step works from this table.
- Reference images for video: **Krea2 (`generate_image_krea2`) is the mandatory default engine**.
  **CRITICAL RULE: Claude MUST generate ALL needed reference assets (product, character, key props) before rendering clips.**
  Never generate only 1 generic product image if characters or specific environments appear.
  If a human character appears in any shot (e.g. eating, reacting), Claude MUST generate a realistic character reference image with Krea2 first, and inject BOTH product and character via H3 multi-reference (`<Picture 1>`, `<Picture 2>`). This eliminates generic plastic AI faces and guarantees character consistency.
  The owner's attached images (e.g. product) are used as-is; all missing assets are generated with Krea2. Drama: build a character reference sheet first, use it in every shot.

## Genre profiles (short files, load only the requested one)
Common pipeline; a profile sets: default aspect + length range, scenario principle, review weights + instant-fail items,
reference plan, narration/dialogue/music/subtitle weight.
- ad: strict product/logo match; hook -> product -> copy -> ending. - short drama: character consistency first, dialogue,
cut continuity. - short-form/vlog: 9:16, fast cuts, subtitles, rhythm over product. - others: nearest profile + changes.

## Architecture (decided)
- **Persistent remote MCP server on the backend PC** (Streamable HTTP, auto-start with Windows/ComfyUI). Single user.
  Reachable from other machines via the owner's Cloudflare tunnel (they already use comfy.tjtj.cloud / studio.tjtj.cloud).
  ffmpeg, STT, project folders, job state all live on the backend; clients only exchange paths + summaries.
- Long jobs run server-side and survive client disconnects: submit -> completion signal -> result. State persisted in files.
- Security (still needed even for one user, it is an internet-facing door): token auth required, file paths locked to the
  project folder, concurrency + daily generation caps, NO generic shell tool — only fixed generation/edit tools.
- The director logic (scenario, verdicts, retry decisions) runs in whichever Claude is connected; the director skill +
  genre profiles + rubric are served by the MCP so every client uses the same rules.
- Tools to expose: image generate/edit/upscale (Krea2, Qwen Image 2.1, Klein, Z-Image), video (MiniMax H3 incl. reference
  injection, one-take chain, face refine), video upscale (RTX), music, prompt enhance/refine, gallery/asset list;
  media tools: frame extract + grid, quality metrics, audio split + STT, text overlay, A/V sync, concat/stitch.
- Project folder: `<name>/brief, scenario(shot list), refs/, clips/clipNN/attemptN + review.json, audio/, final/, report`.

## What already exists (verified by listing, not run)
`C:\AI\AI_One_Studio\*-headless\` = zero-dependency Node 20+ packages (build ComfyUI graph -> POST /prompt -> poll
/history -> /view): `h3-headless` (ref2va, fl2va, l2va, t2va, onetake, facerefine, imagegen, charsheet, imageupscale),
`krea2-headless` (t2i, i2i, identity edit, ControlNet), `qwen21-headless`, `zimage-headless`, `klein-headless`
(t2i/i2i/edit/inpaint/outpaint/faceswap), `upscale-headless` (SeedVR2), `video-rtx-headless`, `music-headless`
(acestep | minimax). Each has `README.md` with the job.json schema; `HEADLESS_HANDOFF.md` in the studio repo is the overview.
Each `index.mjs` exports `generate(job, comfyConfig, opts)` -> `{ok, outputs[], localFiles[], ...}` or `{ok:false, error, stage}`.
`comfy.json`: `{ baseUrl, headers?, timeoutMs? }`; local: `http://127.0.0.1:8188`.
NOT covered by headless: Anima, SDXL, Qwen Image Edit 2511 (editing in the studio web app only). The web app source
`C:\AI\AI_One_Studio\src\tools\*` is the reference if one of them is needed later. Do not edit the studio repo or the node
pack (`C:\AI\ComfyUI-Easy-Install\ComfyUI\custom_nodes\ComfyUI-TJ_NODE_STUDIO_ONE`) from here; other sessions own them.
Reuse headless code by copying into this project (note the source commit), don't rewrite it.

## Not yet checked (do in step 1, check only — install nothing without the owner's say-so)
ffmpeg / ffprobe, Whisper (or faster-whisper) for STT, Python, Node version, ComfyUI reachable at 127.0.0.1:8188,
`@modelcontextprotocol/sdk` availability, which Korean TTS (if any) exists. Open decision for narration: use H3's own
generated speech vs a separate TTS — decide after seeing what is installed; pick one and record it.

## Build order (minimal end-to-end first, then widen)
1. Environment check (above).
2. MVP: studio MCP skeleton (HTTP + token + path lock + job state) with image generate (Krea2, Qwen 2.1), one H3 video
   tool with reference injection and the 7+1 defaults, frame-grid + numeric quality tools, concat. Verify each tool with a
   dry run, then one real small run.
3. Director skill (core one-pager) + `ad` profile + rubric + project folder/state files.
4. End-to-end test: a short 2-clip ad. Fix what breaks.
5. Widen: music, RTX upscale, audio split/STT/sync, text overlay, other genre profiles, remaining image tools, auto-start.
Estimate given to the owner: ~10-15 h of work total; MVP ~5-7 h; GPU time in step 4 is the main uncertainty.

## Working rules from the owner
- Don't run tools or build while the owner is still explaining; start on an explicit "start". Sentences about how the
  finished system should behave (autonomous, no approvals) are design requirements, not a go signal.
- The shared ComfyUI server config (e.g. `/minimax_h3_one/config`) is the owner's real data: read first, change nothing
  you don't have to, restore anything you changed. Never write/remove browser `aos_sensitive_media_v1`.
- Layout/proportions are tuned by the owner manually. Windows: use Write/Edit tools for files with Korean or backslashes
  (PowerShell Set-Content and heredocs mangle them).
- Report "verified" (actually run) separately from "not verified".
