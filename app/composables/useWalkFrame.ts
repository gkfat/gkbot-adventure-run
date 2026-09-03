/**
 * Drives the "walking beat" flag for the adventure page's character stage.
 * Unlike `useIdleBreathingFrame` (always running while mounted), this only
 * stays true for the duration of a single `advance()` call — the caller
 * starts it on click and stops it once the walk beat is done, independent
 * of when the `advance()` API response itself arrives (see
 * adventure-run-presentation spec: the animation and the API response are
 * separate concerns). Character sprites are static (no walk-cycle frames),
 * so this only gates CSS/UI state (e.g. hiding the combat result banner
 * while walking), not which image is shown.
 */
export function useWalkFrame() {
    const isWalking = ref(false);

    const start = () => {
        isWalking.value = true;
    };

    const stop = () => {
        isWalking.value = false;
    };

    onUnmounted(stop);

    return {
        isWalking, start, stop,
    };
}
