import type { SkillEffect } from '../../shared/types/adventure';

export interface SkillEntry {
    skillId: string;
    name: string;
    icon: string;
    unlockFragmentCost: number;
    fragmentCount?: number;
    description?: string;
    unlocked: boolean;
    level?: number;
    exp?: number;
    effect?: SkillEffect;
    // 只有已解鎖的技能才有值——Lv.1~SKILL_MAX_LEVEL 全部等級的效果數值，供強化
    // UI 依選擇的碎片數量算出會落在哪一級、預覽該級效果（known-issue.md #2）。
    effectByLevel?: SkillEffect[];
    // 只有已解鎖的技能才有值——固定充能秒數，不隨等級變動，供戰鬥演出畫充能條、
    // 技能詳情 dialog 顯示用。
    chargeSec?: number;
    isEquipped?: boolean;
}

type EquippedSkillIds = [string | null, string | null, string | null];

interface GetSkillsResponse {
    success: boolean;
    data: { skills: SkillEntry[]; unlockedSlotCount: number; equippedSkillIds: EquippedSkillIds };
}

interface UnlockOrStrengthenResponse {
    success: boolean;
    data: { skillFragments: Record<string, number>; unlockedSkills: Record<string, { exp: number; level: number }> };
}

interface EquipResponse {
    success: boolean;
    data: { equippedSkillIds: EquippedSkillIds };
}

const skills = ref<SkillEntry[]>([]);
const unlockedSlotCount = ref(1);
const equippedSkillIds = ref<EquippedSkillIds>([
    null,
    null,
    null,
]);
const loading = ref(false);
const loaded = ref(false);
const error = ref<string | null>(null);

const actionLoading = ref(false);
const actionError = ref<string | null>(null);

/**
 * Character Skills Composable (character-skills)
 * 管理目前選定角色的技能資料（碎片/解鎖/等級/佩戴欄位）與解鎖/強化/裝備操作。
 */
export const useCharacterSkills = () => {
    const api = useApi();
    const { selectedCharacterId } = useCharacter();

    const fetchSkills = async () => {
        if (!selectedCharacterId.value) return;

        loading.value = true;
        error.value = null;

        try {
            const response = await api.get<GetSkillsResponse>(`/api/character/${selectedCharacterId.value}/skills`);
            skills.value = response.data.skills;
            unlockedSlotCount.value = response.data.unlockedSlotCount;
            equippedSkillIds.value = response.data.equippedSkillIds;
            loaded.value = true;
        } catch (err: any) {
            console.error('[useCharacterSkills] Failed to fetch skills:', err);
            error.value = err.message || '無法取得技能資料';
        } finally {
            loading.value = false;
        }
    };

    const unlockSkill = async (skillId: string): Promise<boolean> => {
        if (!selectedCharacterId.value) return false;

        actionLoading.value = true;
        actionError.value = null;

        try {
            await api.post<UnlockOrStrengthenResponse>(`/api/character/${selectedCharacterId.value}/skills/unlock`, { skillId });
            await fetchSkills();
            return true;
        } catch (err: any) {
            console.error('[useCharacterSkills] Failed to unlock skill:', err);
            actionError.value = err.message || '解鎖失敗';
            return false;
        } finally {
            actionLoading.value = false;
        }
    };

    const strengthenSkill = async (skillId: string, fragmentsToSpend: number): Promise<boolean> => {
        if (!selectedCharacterId.value) return false;

        actionLoading.value = true;
        actionError.value = null;

        try {
            await api.post<UnlockOrStrengthenResponse>(`/api/character/${selectedCharacterId.value}/skills/strengthen`, {
                skillId, fragmentsToSpend,
            });
            await fetchSkills();
            return true;
        } catch (err: any) {
            console.error('[useCharacterSkills] Failed to strengthen skill:', err);
            actionError.value = err.message || '強化失敗';
            return false;
        } finally {
            actionLoading.value = false;
        }
    };

    const equipSkill = async (skillId: string | null, slotIndex: 0 | 1 | 2): Promise<boolean> => {
        if (!selectedCharacterId.value) return false;

        actionLoading.value = true;
        actionError.value = null;

        try {
            await api.post<EquipResponse>(`/api/character/${selectedCharacterId.value}/skills/equip`, {
                skillId, slotIndex,
            });
            await fetchSkills();
            return true;
        } catch (err: any) {
            console.error('[useCharacterSkills] Failed to update skill loadout:', err);
            actionError.value = err.message || '佩戴/卸下失敗';
            return false;
        } finally {
            actionLoading.value = false;
        }
    };

    const reset = () => {
        skills.value = [];
        unlockedSlotCount.value = 1;
        equippedSkillIds.value = [
            null,
            null,
            null,
        ];
        loaded.value = false;
        error.value = null;
        loading.value = false;
        actionError.value = null;
    };

    return {
        skills: computed(() => skills.value),
        unlockedSlotCount: computed(() => unlockedSlotCount.value),
        equippedSkillIds: computed(() => equippedSkillIds.value),
        loading: computed(() => loading.value),
        loaded: computed(() => loaded.value),
        error: computed(() => error.value),
        actionLoading: computed(() => actionLoading.value),
        actionError: computed(() => actionError.value),

        fetchSkills,
        unlockSkill,
        strengthenSkill,
        equipSkill,
        reset,
    };
};
