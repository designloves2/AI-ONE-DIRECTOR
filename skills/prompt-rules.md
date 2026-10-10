# AI ONE DIRECTOR — CANONICAL PROMPT RULES

This document defines the formal, canonical rules for generating prompts across image and video models in AI ONE DIRECTOR.
All rules are directly grounded in the official guides from [ComfyUI-Prompt-Studio/guides](https://github.com/designloves2/ComfyUI-Prompt-Studio/tree/main/guides) stored in `skills/prompt_guides/`.

---

## 1. Natural Spoken Dialogue & Rich Voice Actor Profiling (CRITICAL)

### A. [금지: 딱딱한 안내문/광고 책자 문어체 금지]
- ❌ **로봇 같은 문어체 (BANNED)**:
  `"오늘 점심, 특별한 한 끼를 원할 땐?"`, `"정성을 가득 담은 한식 도시락."`, `"한 모금에 깨어나는 에너지."`
  *이러한 교과서적/홍보책자 문구는 AI가 읽을 때 심각하게 기계적이고 로봇 같은 국어책 읽기 톤을 유발합니다.*

### B. [필수: 생생한 생활 밀착형 구어체 & 감정 추임새]
- ✅ **살아있는 대화체 (MANDATORY)**:
  - 실제 사람이 감정을 담아 내뱉는 생생한 입말, 감탄사(`와~`, `음~!`, `크으~`, `헐`), 말줄임표(`...`), 쉼표(`,`), 호흡을 적극 활용합니다.
  - **피로/야근 상황**: `<d>[Korean] 아... 오늘 진짜 영혼까지 다 털렸다... 어? 이거 뭐야?</d>`
  - **각성/에너지 폭발**: `<d>[Korean] 크으~! 눈이 번쩍 뜨이는데?! 바로 야근 끝내러 간다!</d>`
  - **음식 시식/먹방**: `<d>[Korean] 와... 김 모락모락 나는 것 좀 봐... 불고기 불향 미쳤다, 진짜!</d>`
  - **친근한 나레이션**: `<d>[Korean] 오늘 점심 뭐 먹을지 고민 끝! 든든하고 정갈한 맥도시락, 오늘 무조건 각이지.</d>`

### C. Multi-Dimensional Voice Actor Profiling (화자 음향 묘사 4대 요소)
단순히 `a Korean woman`이나 `a narrator`로 적으면 H3 음성 합성 엔진이 무미건조한 기본 기계음을 출력합니다.
반드시 화자 ID `(S1)` 앞에 **[연령/성별] + [감정/상황 상태] + [음색(Timbre)] + [호흡/말하기 템포(Cadence & Breath)]**를 입체적으로 서술해야 합니다:

1. **지치고 피곤한 20대 남성 직장인**:
   `A tired 20s Korean male office worker with an exhausted, raspy sighing voice and heavy weary breathing (S1) says: <d>[Korean] 아... 오늘 진짜 영혼까지 탈탈 털렸다...</d>`
2. **신선함과 맛에 감탄하는 20대 여성 크리에이터**:
   `A lively 20s Korean female food creator with an excited, breathy bright timbre, smiling intonation, and fast conversational cadence (S1) says: <d>[Korean] 와... 김 모락모락 나는 것 좀 봐... 불고기 불향 미쳤다, 진짜!</d>`
3. **자신감 넘치고 에너지 폭발하는 직장인**:
   `The energized Korean office worker with an excited, roaring resonant voice, confident grin, and powerful punchy delivery (S1) says: <d>[Korean] 크으~! 눈이 번쩍 뜨이는데?! 초광속으로 끝내버리자!</d>`
4. **세련되고 따뜻한 30대 성우 나레이션 (Voiceover)**:
   `A friendly and charismatic 30s Korean commercial voiceover artist with a warm smiling tone, rich baritone resonance, and relaxed conversational cadence (S1) says in an off-screen voiceover: <d>[Korean] 오늘 점심 고민 끝! 따끈따끈 정갈한 맥도시락, 지금 바로 만나보세요.</d> while the actors on screen have their lips completely closed.`

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
Contains visual style, subjects, camera motions, and **ALL human speech (dialogue and voiceover)** formatted according to Section 1 above.

#### 1) Camera Motion Grammar
Use: `[Motion Type] + [Amplitude] + [Speed]`
- *Motion Types*: `Push In / Pull Out`, `Pan Left / Pan Right`, `Truck Left / Truck Right`, `Tilt Up / Tilt Down`, `Arc Shot`, `Tracking Shot`, `Static Shot`, `Zoom In / Zoom Out`.
- *Amplitude & Speed*: `with small/large amplitude`, `at slow/fast speed`.
- *Example*: `The camera pushes in with small amplitude at slow speed toward the steaming dish.`

#### 2) Multi-Reference Anchors
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

## 3. Image Generation Prompt Rules (Krea 2 Default)
*Reference: `skills/prompt_guides/krea_2/t2i.md`*

- **Natural Language Prose Wins**: Write full sentences and flowing descriptive paragraphs. **Never use comma-separated keyword tag soup**.
- **8-Layer Prompt Structure**: `[Subject] + [Action/Pose] + [Setting/Environment] + [Composition/Framing] + [Medium/Style] + [Lighting] + [Color & Texture] + [Extra Grounding Details]`.
