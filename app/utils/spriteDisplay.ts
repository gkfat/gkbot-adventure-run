/**
 * Idle-breathing animation frames are stored alongside each archetype's base
 * sprite as `{name}-breathe-{1,2}.png` (torso-only movement; level 2 is the
 * inhale peak), so frames can be derived from `spriteUrl` without a separate
 * field on the character/archetype schema.
 *
 * The step sequence below walks the levels up then back down (0,1,2,1)
 * so the loop reads as 2 inhale frames followed by 2 exhale frames, and
 * wraps seamlessly back to rest (level 0) as it repeats.
 */
const BREATH_LEVEL_SEQUENCE = [
    0,
    1,
    2,
    1,
] as const;

export const BREATH_FRAME_COUNT = BREATH_LEVEL_SEQUENCE.length;

export const breatheFrameUrl = (spriteUrl: string, step: number) => {
    const level = BREATH_LEVEL_SEQUENCE[step] ?? 0;
    return level === 0 ? spriteUrl : spriteUrl.replace(/\.png$/, `-breathe-${level}.png`);
};

/**
 * The adventure page shows the character from behind (facing away, into the
 * facility) rather than the front-facing camp-screen portrait. Back sprites
 * are static — no breathing or walk-cycle frames exist for them.
 */
export const backSpriteUrl = (spriteUrl: string) => spriteUrl.replace(/\.png$/, '-back.png');
