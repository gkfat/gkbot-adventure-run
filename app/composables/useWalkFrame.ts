import { WALK_FRAME_COUNT } from '../utils/spriteDisplay';

const FRAME_DURATION_MS = 150;

/**
 * Drives the walk-cycle frame step for the adventure page's character sprite.
 * Unlike `useIdleBreathingFrame` (always running while mounted), this only
 * animates for the duration of a single `advance()` call — the caller starts
 * it on click and stops it once the walk beat is done, independent of when
 * the `advance()` API response itself arrives (see adventure-run-presentation
 * spec: the animation and the API response are separate concerns).
 */
export function useWalkFrame() {
    const step = ref(0);
    const isWalking = ref(false);
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
        if (timer) return;
        isWalking.value = true;
        step.value = 0;
        timer = setInterval(() => {
            step.value = (step.value + 1) % WALK_FRAME_COUNT;
        }, FRAME_DURATION_MS);
    };

    const stop = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        isWalking.value = false;
        step.value = 0;
    };

    onUnmounted(stop);

    return {
        step, isWalking, start, stop,
    };
}
