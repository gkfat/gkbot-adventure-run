import {
    resolveDialogueLines, type DialogueSubject, type DialogueTrigger,
} from '../constants/dialogueLines';

// 顯示時長：固定 2.4s 後自動淡出（見 design.md 決策 4），沿用 useCombat.ts
// cardFx/sparkFx 的 Map.set + setTimeout 清除 pattern。
const BUBBLE_DISPLAY_MS = 2400;
// 一般攻擊命中（非爆擊）的氣泡顯示機率節流，避免高頻連續攻擊洗版（design.md
// 決策 5）；其餘 trigger 一律必顯示。
const ATTACK_DISPLAY_CHANCE = 0.35;

export type DialogueBubbleState = { text: string; key: number };

// 單例狀態：戰鬥（useCombat.ts）與事件結算（adventure.vue）都要能各自觸發
// 對話氣泡，敵人卡片（combatResultPanel.vue）與玩家 stage（adventure.vue）都要
// 能讀到同一份 bubbles，比照 useCharacter.ts/useAdventureRun.ts 的 module-level
// singleton 慣例。
const bubbles = reactive(new Map<string, DialogueBubbleState>());
const lastLineIndex = new Map<string, number>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let keySeq = 0;

// 同一時間只有一個敵人能顯示氣泡（玩家不受影響，玩家與敵人各自獨立）：多敵人
// 同時出手時，若目前已有另一隻敵人的氣泡還在顯示中，這次觸發直接忽略，等該
// 敵人的氣泡淡出後才輪得到下一次觸發顯示，避免多敵人同時「開口」造成雜訊。
let activeEnemySpeakerId: string | null = null;

// 均勻隨機挑選，同一主體同一 trigger 若題庫長度 > 1，避免連續兩次抽到同一個
// 索引（抽到相同就往後移一格，不做加權/冷卻歷史，見 design.md 決策 4）。
const pickLineIndex = (lines: string[], historyKey: string): number => {
    if (lines.length <= 1) return 0;
    const previous = lastLineIndex.get(historyKey);
    let index = Math.floor(Math.random() * lines.length);
    if (index === previous) index = (index + 1) % lines.length;
    return index;
};

const clearBubble = (subjectId: string) => {
    bubbles.delete(subjectId);
    const timer = timers.get(subjectId);
    if (timer) clearTimeout(timer);
    timers.delete(subjectId);
    if (activeEnemySpeakerId === subjectId) activeEnemySpeakerId = null;
};

export function useDialogueBubble() {
    const triggerDialogue = (subjectId: string, trigger: DialogueTrigger, subject: DialogueSubject) => {
        if (
            subject.kind === 'enemy'
            && activeEnemySpeakerId !== null
            && activeEnemySpeakerId !== subjectId
            && bubbles.has(activeEnemySpeakerId)
        ) return;

        if (trigger === 'ATTACK' && Math.random() >= ATTACK_DISPLAY_CHANCE) return;

        const lines = resolveDialogueLines(subject, trigger);
        if (lines.length === 0) return;

        const historyKey = `${subjectId}:${trigger}`;
        const index = pickLineIndex(lines, historyKey);
        lastLineIndex.set(historyKey, index);

        const existing = timers.get(subjectId);
        if (existing) clearTimeout(existing);

        bubbles.set(subjectId, {
            text: lines[index]!, key: keySeq++,
        });
        if (subject.kind === 'enemy') activeEnemySpeakerId = subjectId;
        timers.set(subjectId, setTimeout(() => clearBubble(subjectId), BUBBLE_DISPLAY_MS));
    };

    const clearAllBubbles = () => {
        timers.forEach(timer => clearTimeout(timer));
        timers.clear();
        bubbles.clear();
        activeEnemySpeakerId = null;
    };

    return {
        bubbles,
        triggerDialogue,
        clearAllBubbles,
    };
}
