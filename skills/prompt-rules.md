# AI ONE DIRECTOR — CANONICAL PROMPT RULES

This document defines the formal, canonical rules for generating prompts across image and video models in AI ONE DIRECTOR.
All rules are directly grounded in the official guides from [ComfyUI-Prompt-Studio/guides](https://github.com/designloves2/ComfyUI-Prompt-Studio/tree/main/guides) stored in `skills/prompt_guides/`.

---

## 1. Image Generation Prompt Rules (Krea 2 Default)
*Reference: `skills/prompt_guides/krea_2/t2i.md`*

### Core Philosophy
- **Natural Language Prose Wins**: Write full sentences and flowing descriptive paragraphs. **Never use comma-separated keyword tag soup** (e.g. `1girl, solo, 8k, masterpiece, trending on artstation` is strictly banned).
- **Concrete Grounding over Abstract Words**: Do not use vague fluff words like "cinematic", "epic", "beautiful". Instead, explicitly describe concrete lighting setups, camera lenses, surface textures, material physics, and colors.

### The 8-Layer Prompt Structure
Fold these layers into connected English prose:
1. **Subject**: Who/what is the focus with defining features (e.g. `A weathered Korean fisherman in his sixties with salt-crusted grey stubble`).
2. **Action / Pose**: Exact posture and orientation (e.g. `Holding a hot steamed Korean bento with two hands, steam rising into the air`).
3. **Setting / Environment**: Background and environment details (e.g. `Seated at a clean sunlit wooden dining table next to a large cafe window`).
4. **Composition / Framing**: Shot type and depth of field (e.g. `Eye-level medium close-up shot, shallow depth of field, food in razor sharp focus`).
5. **Medium / Style**: Specific photography or art medium (e.g. `35mm commercial documentary photograph, soft film grain`).
6. **Lighting**: Source, direction, and color temperature (e.g. `Warm golden morning sunlight from the side, soft diffuse shadows`).
7. **Color & Texture**: Palette, material qualities, surface sheen (e.g. `Glistening glazed sauce on tender meat, plump translucent rice grains, natural skin pores`).
8. **Extra Grounding Details**: Tiny anchors of realism (e.g. `Delicate condensation droplets on the water glass, faint rising steam curls`).

---

## 2. MiniMax H3 Video Generation Prompt Rules
*References: `skills/prompt_guides/minimax_h3/base.md` & `skills/prompt_guides/minimax_h3/ref.md`*

Every prompt submitted to `generate_video_h3` MUST be structured with the 3 mandatory fields:

```text
integrated_multimodal_description: [Shot N] ...

overall_soundscape: ...

non_diegetic_music: ...
```

### A. `integrated_multimodal_description` (Visuals + Camera + Speech)
Contains visual style, subjects, camera motions, and **ALL human speech (dialogue and voiceover)**.

#### 1) Camera Motion Grammar
Use: `[Motion Type] + [Amplitude] + [Speed]`
- *Motion Types*: `Push In / Pull Out`, `Pan Left / Pan Right`, `Truck Left / Truck Right`, `Tilt Up / Tilt Down`, `Arc Shot`, `Tracking Shot`, `Static Shot`, `Zoom In / Zoom Out`.
- *Amplitude & Speed*: `with small/large amplitude`, `at slow/fast speed`.
- *Example*: `The camera pushes in with small amplitude at slow speed toward the steaming dish.`

#### 2) Spoken Dialogue & Voiceover (CRITICAL FOR AUDIO)
**Without this exact markup, the H3 audio model WILL NOT synthesize human voices.**
- **Speaker ID**: Assign a unique ID to each speaking entity: `(S1)`, `(S2)`.
- **On-screen Character Speaking**:
  - *Syntax*: `The young Korean woman with a bright, cheerful voice (S1) says: <d>[Korean] 정말 맛있다!</d>`
- **Off-screen Narration / Voiceover (성우 나레이션)**:
  - Must use the phrase `says in an off-screen voiceover`.
  - Must state that on-screen characters' lips remain closed.
  - *Syntax*: `A professional Korean narrator with a warm, trustworthy voice (S1) says in an off-screen voiceover: <d>[Korean] 오늘 점심, 정성을 가득 담은 맥도시락.</d> while the characters on screen have their lips completely closed.`

#### 3) Multi-Reference Anchors
Designate reference images as `<Picture 1>`, `<Picture 2>`, `<Picture 3>`.
- *Example*: `The customer hands <Picture 1> the energy drink can to the young woman shown in <Picture 2>.`

### B. `overall_soundscape` (Ambience & Foley)
1–3 English sentences summarizing physical action sounds, foley, and room ambience.
- **INCLUDE**: Sizzling, rustling, chewing, crunch, lid clicks, wind, footsteps.
- **DO NOT INCLUDE**: Spoken dialogue (belongs in section A) or background music (belongs in section C).
- *Example*: `Gentle rustle of paper packaging, soft wooden lid opening click, quiet dining room ambience, and delicate sizzling vapor.`

### C. `non_diegetic_music` (Audience BGM)
1–2 English sentences describing background score for the audience. Focus on **instruments, tempo, and rhythm**.
- *Example*: `An upbeat, cheerful acoustic guitar melody at moderate tempo with a bright whistling motif and light percussion, resolving on a warm brass chime.`

---

## 3. Dedicated Guide Files in Repository
- `skills/prompt_guides/krea_2/t2i.md`: Full Krea 2 official prompt guide
- `skills/prompt_guides/minimax_h3/base.md`: MiniMax H3 T2VA / I2VA / FL2VA / L2VA prompt guide
- `skills/prompt_guides/minimax_h3/ref.md`: MiniMax H3 Ref2VA 6-section full reference rewrite guide
- `skills/prompt_guides/qwen_image_2.1/t2i.md`: Qwen Image 2.1 T2I 8-step guide
- `skills/prompt_guides/qwen_image_2.1/edit.md`: Qwen Image 2.1 Image Edit guide
- `skills/prompt_guides/anima/t2i.md`: Anima T2I prompt guide
