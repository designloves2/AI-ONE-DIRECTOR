# GENRE PROFILE: AD (Commercial)

## Pacing & Structure (Dynamic Rhythms, NEVER 10s x 3)
1. **Hook (3-5s)**: Eye-catching opening, problem statement, or sensory contrast. Must be snappy (3~5s), never a slow 10-second drag.
2. **Product Reveal & Macro Sizzle (6-9s)**: Deep, mouthwatering food/product texture, soundscape, and lighting.
3. **Benefit / Delight Reaction (3-5s)**: Real customer tasting, reacting with genuine emotion.
4. **Lifestyle / Usage Context (5-8s)**: Sharing with friends, dynamic energy, or situational joy.
5. **Call To Action & Ending (4-6s)**: Brand tagline, hero package lock, clear call to action.

*A standard 30-second commercial consists of 4 to 6 varied, fast-paced shots (e.g. 4s + 8s + 5s + 8s + 5s = 30s). Never uniformly slice into 10s x 3.*

## Key Rules
- **Natural Spoken Korean Dialogue (구어체 대사 원칙)**:
  - **No Stiff Brochure Language**: 절대 딱딱한 안내문 문어체를 쓰지 않습니다. 실제 사람이 말하는 생생한 감탄사와 구어체로 대사를 구성합니다.
  - **Rich Voice Profiling**: 화자 ID `(S1)` 앞에 연령, 성별, 감정 상태, 음색(Timbre), 호흡/속도(Cadence)를 3개 이상의 형용사로 서술하여 로봇 톤을 제거합니다.
- **Reference Asset Pool & Selective Shot Mapping**:
  - Pre-generate an asset pool (product angles, macro cross-section, character expressions, packaging/tray) using **Krea2**.
  - **Do NOT inject all images identically to every shot.**
  - Selectively map only the necessary reference images (and differing counts: 1~3 images) per shot from this shared pool.
- **Product Match is Critical**: Product shape, colors, and package logo MUST match the reference image. Any deviation is an instant fail.
- **Mandatory Human Character Reference (Krea2)**:
  - If a human model/customer appears, pre-generate realistic character reference image(s) with **Krea2** into the asset pool.
  - Inject character reference into character-focused shots alongside product reference (`<Picture 1>` product, `<Picture 2>` character).
- **Korean Typography**: Overlay via FFmpeg in the edit step. Never let video diffusion draw Korean text.
- **Aspect Ratio**: 16:9 Landscape for TV/Web commercial, 9:16 Portrait for Social/Short-form ad.
- **Audio Balance**: Crisp narration/soundscape, non-intrusive upbeat background music.
