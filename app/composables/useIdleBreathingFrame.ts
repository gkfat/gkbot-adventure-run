import { BREATH_FRAME_COUNT } from '../utils/spriteDisplay';

const FRAME_DURATION_MS = 200;
const PEAK_HOLD_MS = 500;
const RESTED_HOLD_MS = 500;

/**
 * How long each step in the shared breath sequence (rest, L1, L2, L1) is held
 * before advancing: 2 inhale steps of 350ms, hold 1.2s at the peak, 2 exhale
 * steps of 350ms, hold 1.5s at rest, then repeat.
 */
const STEP_DURATIONS_MS = [
    RESTED_HOLD_MS,
    FRAME_DURATION_MS,
    PEAK_HOLD_MS,
    FRAME_DURATION_MS,
];

const step = ref(0);
let timer: ReturnType<typeof setTimeout> | null = null;
let subscriberCount = 0;

const scheduleNext = () => {
    const duration = STEP_DURATIONS_MS[step.value] ?? FRAME_DURATION_MS;
    timer = setTimeout(() => {
        step.value = (step.value + 1) % BREATH_FRAME_COUNT;
        scheduleNext();
    }, duration);
};

/**
 * Drives the shared idle-breathing frame step for every character sprite on
 * screen. A single timer is reused across all subscribers so multiple
 * sprites (e.g. the archetype carousel) animate in sync without spawning one
 * timer per sprite.
 */
export function useIdleBreathingFrame() {
    onMounted(() => {
        if (subscriberCount === 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            scheduleNext();
        }
        subscriberCount++;
    });

    onUnmounted(() => {
        subscriberCount--;
        if (subscriberCount === 0 && timer) {
            clearTimeout(timer);
            timer = null;
        }
    });

    return step;
}
