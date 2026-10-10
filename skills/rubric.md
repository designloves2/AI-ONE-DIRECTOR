# REVIEW RUBRIC

## 1. Instant Fail (Any ONE triggers immediate regeneration)
1. **Product Distortion**: Product shape, dominant color, or logo differs noticeably from reference.
2. **Body/Face Deformation**: Hands with abnormal finger counts, distorted faces, broken anatomy.
3. **Broken In-Video Text**: Any deformed or hallucinated text inside the video (excluding clean FFmpeg overlays).
4. **Missing Core Prompt Elements**: Subject or primary action requested in the shot prompt is missing.
5. **Speech Mismatch**: Transcribed speech differs from the required script.
6. **Objective Quality Failure**: Blackout (>1.5s), frozen frames (>2.0s), low resolution, extreme blur.

---

## 2. Face Detail Review & Auto-Refine Protocol (얼굴 크기별 판정 및 복구)
*얼굴 크기가 작은 풀샷/미디엄샷에서는 픽셀 뭉개짐(smudging)이 발생하기 쉽습니다.*

1. **클로즈업 샷 (Bypass)**:
   - 얼굴이 화면 대부분을 차지하는 바스트/클로즈업 샷은 H3 기본 렌더링으로 충분히 선명하므로 별도의 Face Refine 검토를 건너뜁니다.
2. **원거리 / 풀샷 (Face Clarity Check)**:
   - 전신 샷, 거리 걷기 샷 등 **얼굴 크기가 작게 나오는 샷은 그리드 검토 시 얼굴 픽셀의 선명도를 반드시 확인**합니다.
3. **Face Refine 자동 복구 프로세스 (Auto-Recovery)**:
   - 작은 얼굴에서 눈/코/입 이목구비 뭉개짐이나 흐릿함이 발견된 경우:
     - ❌ **전체 클립을 처음부터 다시 생성하지 않습니다** (배경/동작이 잘 나왔다면 전체 재생성은 시간 낭비).
     - ✅ **즉시 `enhance_face_refine` 도구를 호출**하여, 얼굴 영역만 768x768 캔버스로 크롭/인물 레퍼런스 기반 고화질 복구한 뒤 원본 클립에 매끄럽게 합성합니다.
     - 복구된 클립(`video_facerefined.mp4`)을 확인 후 최종 PASS 처리합니다.

---

## 3. Scoring (0 to 2 Points Each, Max 10 Points)
1. **Prompt Adherence (0-2)**:
   - 2: All key elements and action dynamics present.
   - 1: Most elements present, minor secondary element missing.
   - 0: Major element missing (triggers instant fail).
2. **Motion Naturalness (0-2)**:
   - 2: Smooth, physically believable camera and subject motion.
   - 1: Minor slight jitter or slow motion, acceptable overall.
   - 0: Severe morphing, teleportation, or unnatural physics.
3. **Continuity with Previous Clip (0-2)**:
   - 2: Visual, lighting, and spatial continuity maintained between shots.
   - 1: Minor lighting or angle shift, still cohesive.
   - 0: Total mismatch in style, character look, or environment.
   - *(Note: Clip 1 gets automatic 2 points for continuity)*.
4. **Audio Clarity (0-2)**:
   - 2: Clear dialogue/narration, appropriate sound effects and volume.
   - 1: Minor audio artifact, understandable.
   - 0: Inaudible or completely clipped/distorted.
5. **Aesthetic / Scene Quality (0-2)**:
   - 2: High commercial polish, pleasing lighting, sharp details.
   - 1: Acceptable standard quality.
   - 0: Muddy, excessively noisy, or unappealing composition.

## Verdict Decision
- **PASS**: No Instant Fail AND Total Score >= 7 / 10.
- **FAIL**: Any Instant Fail OR Total Score < 7. Must provide exact 1-line fail reason (`"frame N: X is wrong"`).
- **ADOPT**: Used ONLY after 3 consecutive failures for a clip. Adopt the highest scoring attempt among the 3 and proceed.
