# REVIEW RUBRIC

## Instant Fail (Any ONE triggers immediate regeneration)
1. **Product Distortion**: Product shape, dominant color, or logo differs noticeably from reference.
2. **Body/Face Deformation**: Hands with abnormal finger counts, distorted faces, broken anatomy.
3. **Broken In-Video Text**: Any deformed or hallucinated text inside the video (excluding clean FFmpeg overlays).
4. **Missing Core Prompt Elements**: Subject or primary action requested in the shot prompt is missing.
5. **Speech Mismatch**: Transcribed speech differs from the required script.
6. **Objective Quality Failure**: Blackout (>1.5s), frozen frames (>2.0s), low resolution, extreme blur.

## Scoring (0 to 2 Points Each, Max 10 Points)
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
