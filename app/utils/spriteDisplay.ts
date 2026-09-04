/**
 * Idle animation frames are stored alongside each archetype's base sprite as
 * `{name}-idle-{1,2}.png` (torso-only movement; level 2 is the inhale peak),
 * so frames can be derived from `spriteUrl` without a separate field on the
 * character/archetype schema.
 *
 * The step sequence below walks the levels up then back down (0,1,2,1)
 * so the loop reads as 2 inhale frames followed by 2 exhale frames, and
 * wraps seamlessly back to rest (level 0) as it repeats.
 */
const IDLE_LEVEL_SEQUENCE = [
    0,
    1,
    2,
    1,
] as const;

export const IDLE_FRAME_COUNT = IDLE_LEVEL_SEQUENCE.length;

export const idleFrameUrl = (spriteUrl: string, step: number) => {
    const level = IDLE_LEVEL_SEQUENCE[step] ?? 0;
    return level === 0 ? spriteUrl : spriteUrl.replace(/\.png$/, `-idle-${level}.png`);
};

/**
 * The adventure page shows the character from behind (facing away, into the
 * facility) rather than the front-facing camp-screen portrait. Back sprites
 * have no walk-cycle frames, but can share the same idle frame naming as the
 * front sprite (`{name}-back-idle-{1,2}.png`) — compose with `idleFrameUrl`.
 * All five archetypes ship those files.
 */
export const backSpriteUrl = (spriteUrl: string) => spriteUrl.replace(/\.png$/, '-back.png');
