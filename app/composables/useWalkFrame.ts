import { WALK_FRAME_COUNT } from '../utils/spriteDisplay';

const STEP_DURATION_MS = 160;

/**
 * Drives the "walking beat" flag and walk-cycle sprite step for the
 * adventure page's character stage. Unlike `useIdleFrame` (always running
 * while mounted), this only stays true for the duration of a single
 * `advance()` call — the caller starts it on click and stops it once the
 * walk beat is done, independent of when the `advance()` API response
 * itself arrives (see adventure-run-presentation spec: the animation and
 * the API response are separate concerns).
 */
export function useWalkFrame() {
    const isWalking = ref(false);
    const step = ref(0);
    let timer: ReturnType<typeof setInterval> | null = null;

    const stopTimer = () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    };

    const start = () => {
        isWalking.value = true;
        step.value = 0;
        stopTimer();
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            timer = setInterval(() => {
                step.value = (step.value + 1) % WALK_FRAME_COUNT;
            }, STEP_DURATION_MS);
        }
    };

    const stop = () => {
        isWalking.value = false;
        stopTimer();
        step.value = 0;
    };

    onUnmounted(stop);

    return {
        isWalking, step, start, stop,
    };
}
