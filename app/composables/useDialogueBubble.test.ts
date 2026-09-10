import { reactive } from 'vue';
import {
    afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

// useDialogueBubble.ts 的 reactive 是 Nuxt auto-import（不是檔案自己 import
// 的），vitest 直接載入這個檔案時這個名字並不存在，比照 useCombat.test.ts 的
// 慣例自己 stub 成全域變數。
vi.stubGlobal('reactive', reactive);

const { useDialogueBubble } = await import('./useDialogueBubble');

const PLAYER_FIGHTER = {
    kind: 'player' as const, archetypeId: 'fighter', 
};
const ENEMY_GKBOT_GENERIC = {
    kind: 'enemy' as const, archetypeSlug: 'no-such-slug', faction: 'GKBOT' as const,
};

describe('useDialogueBubble', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        // bubbles/lastLineIndex 是 module-level 單例狀態，每個測試結束都要清掉，
        // 避免前一個測試的殘留（例如 lastLineIndex 的防重複紀錄）影響下一個測試。
        const {
            bubbles, clearAllBubbles, 
        } = useDialogueBubble();
        clearAllBubbles();
        bubbles.clear();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('查無台詞時不寫入 state（不顯示氣泡）', () => {
        const {
            bubbles, triggerDialogue, 
        } = useDialogueBubble();
        // CHOICE 對 GKBOT 通用池沒有定義（只有玩家事件類 trigger 有），敵人身上
        // 觸發應該完全不顯示。
        triggerDialogue('enemy-1', 'CHOICE', ENEMY_GKBOT_GENERIC);
        expect(bubbles.has('enemy-1')).toBe(false);
    });

    it('有可用台詞時寫入 bubbles state', () => {
        const {
            bubbles, triggerDialogue, 
        } = useDialogueBubble();
        triggerDialogue('player', 'CRIT', PLAYER_FIGHTER);
        expect(bubbles.get('player')?.text).toBeTruthy();
    });

    it('固定時長後自動清除', () => {
        const {
            bubbles, triggerDialogue, 
        } = useDialogueBubble();
        triggerDialogue('player', 'CRIT', PLAYER_FIGHTER);
        expect(bubbles.has('player')).toBe(true);
        vi.advanceTimersByTime(2399);
        expect(bubbles.has('player')).toBe(true);
        vi.advanceTimersByTime(1);
        expect(bubbles.has('player')).toBe(false);
    });

    it('新觸發直接覆蓋同 subjectId 既有項目並重設計時器', () => {
        const {
            bubbles, triggerDialogue, 
        } = useDialogueBubble();
        triggerDialogue('player', 'CRIT', PLAYER_FIGHTER);
        const firstKey = bubbles.get('player')!.key;
        vi.advanceTimersByTime(2000);
        triggerDialogue('player', 'DEFEATED', PLAYER_FIGHTER);
        const secondKey = bubbles.get('player')!.key;
        expect(secondKey).not.toBe(firstKey);
        // 舊的計時器（2000ms 時已跑了 2000/2400）不應該在原訂時間點把新氣泡清掉——
        // 若計時器沒有被正確 clearTimeout，這裡會在 t=2400（新氣泡才顯示 400ms）
        // 就被誤刪。
        vi.advanceTimersByTime(400);
        expect(bubbles.has('player')).toBe(true);
    });

    it('清單多句時避免連續兩次挑到同一句', () => {
        const {
            bubbles, triggerDialogue, 
        } = useDialogueBubble();
        const randomSpy = vi.spyOn(Math, 'random');
        // fighter 的 DEFEATED 專屬台詞有 2 句，兩次都想抽中索引 0（random 固定
        // 回傳 0），驗證第二次會被強制移到索引 1，不連續重複。
        randomSpy.mockReturnValue(0);
        triggerDialogue('player', 'DEFEATED', PLAYER_FIGHTER);
        const first = bubbles.get('player')!.text;
        vi.advanceTimersByTime(2400);
        randomSpy.mockReturnValue(0);
        triggerDialogue('player', 'DEFEATED', PLAYER_FIGHTER);
        const second = bubbles.get('player')!.text;
        expect(second).not.toBe(first);
    });

    it('ATTACK 觸發套用顯示機率節流，未中選時不顯示氣泡', () => {
        const {
            bubbles, triggerDialogue, 
        } = useDialogueBubble();
        vi.spyOn(Math, 'random').mockReturnValue(0.99); // >= 0.35，未中選
        triggerDialogue('player', 'ATTACK', PLAYER_FIGHTER);
        expect(bubbles.has('player')).toBe(false);
    });

    it('CRIT 等其餘 trigger 不受機率節流影響', () => {
        const {
            bubbles, triggerDialogue,
        } = useDialogueBubble();
        vi.spyOn(Math, 'random').mockReturnValue(0.99);
        triggerDialogue('player', 'CRIT', PLAYER_FIGHTER);
        expect(bubbles.has('player')).toBe(true);
    });

    it('多敵人同時觸發時，同一時間只有一個敵人顯示氣泡', () => {
        const {
            bubbles, triggerDialogue,
        } = useDialogueBubble();
        triggerDialogue('enemy-1', 'DEFEATED', ENEMY_GKBOT_GENERIC);
        triggerDialogue('enemy-2', 'DEFEATED', ENEMY_GKBOT_GENERIC);
        expect(bubbles.has('enemy-1')).toBe(true);
        expect(bubbles.has('enemy-2')).toBe(false);
    });

    it('說話中的敵人氣泡淡出後，下一次觸發的敵人才輪得到顯示', () => {
        const {
            bubbles, triggerDialogue,
        } = useDialogueBubble();
        triggerDialogue('enemy-1', 'DEFEATED', ENEMY_GKBOT_GENERIC);
        vi.advanceTimersByTime(2400);
        expect(bubbles.has('enemy-1')).toBe(false);
        triggerDialogue('enemy-2', 'DEFEATED', ENEMY_GKBOT_GENERIC);
        expect(bubbles.has('enemy-2')).toBe(true);
    });

    it('敵人說話中不影響玩家自己的氣泡（兩者各自獨立）', () => {
        const {
            bubbles, triggerDialogue,
        } = useDialogueBubble();
        triggerDialogue('enemy-1', 'DEFEATED', ENEMY_GKBOT_GENERIC);
        triggerDialogue('player', 'CRIT', PLAYER_FIGHTER);
        expect(bubbles.has('enemy-1')).toBe(true);
        expect(bubbles.has('player')).toBe(true);
    });

    it('同一隻敵人重複觸發（覆蓋自己）不受「一次一人」限制影響', () => {
        const {
            bubbles, triggerDialogue,
        } = useDialogueBubble();
        triggerDialogue('enemy-1', 'DEFEATED', ENEMY_GKBOT_GENERIC);
        const firstKey = bubbles.get('enemy-1')!.key;
        triggerDialogue('enemy-1', 'DEFEATED', ENEMY_GKBOT_GENERIC);
        expect(bubbles.get('enemy-1')!.key).not.toBe(firstKey);
    });
});
