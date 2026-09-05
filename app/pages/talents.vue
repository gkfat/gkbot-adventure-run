<template>
    <div class="fill-height talents-page pa-3 d-flex flex-column">
        <!-- 讀取中 -->
        <div
            v-if="loading && !character"
            class="d-flex flex-column align-center justify-center fill-height"
        >
            <v-progress-circular
                indeterminate
                color="green"
                :size="56"
                :width="5"
                class="mb-4"
            />
            <div class="font-pixel text-caption" style="color: rgb(var(--v-theme-primary)); opacity: 0.8;">
                載入天賦樹中
            </div>
        </div>

        <!-- 取得失敗 -->
        <div
            v-else-if="error"
            class="d-flex flex-column align-center justify-center fill-height px-6 text-center"
        >
            <v-icon
                icon="mdi-alert-circle-outline"
                size="40"
                color="warning"
                class="mb-3"
            />
            <div class="text-body-2 text-medium-emphasis mb-4">
                {{ error }}
            </div>
            <SystemBtn
                variant="outlined"
                color="primary"
                class="text-none flex-grow-0"
                prepend-icon="mdi-refresh"
                @click="fetchCharacter"
            >
                重試
            </SystemBtn>
        </div>

        <template v-else-if="character">
            <!-- 頂部：職業 + 可用天賦點，固定不隨天賦樹捲動 -->
            <div class="talents-page__box talents-page__box--fixed mb-3 d-flex align-center justify-space-between">
                <span class="text-caption text-medium-emphasis">{{ character.className }} 天賦樹</span>
                <span
                    class="font-pixel text-caption"
                    :style="{ color: character.talentPoints > 0 ? TALENT_POINT_COLOR : 'rgb(var(--v-theme-primary))' }"
                >
                    +{{ character.talentPoints }} 可用天賦點
                </span>
            </div>

            <!-- 天賦樹：由下而上分層，畫面上由上（Tier 5）往下（Tier 1）排列；
                 只有這個區塊可以捲動，進入頁面時預設捲動到 Tier 1 或最新一個已投入的天賦所在層 -->
            <div class="talents-page__scroll">
                <div class="talents-page__tree d-flex flex-column">
                    <div
                        v-for="tier in tiers"
                        :key="tier.tier"
                        :ref="setTierRef(tier.tier)"
                        class="talents-page__tier"
                    >
                        <div class="talents-page__tier-label text-caption text-medium-emphasis">
                            Tier {{ tier.tier }}
                        </div>
                        <div
                            class="talents-page__tier-nodes d-flex ga-2"
                            :class="tier.nodes.length > 1 ? 'justify-space-between' : 'justify-center'"
                        >
                            <button
                                v-for="node in tier.nodes"
                                :key="node.nodeId"
                                type="button"
                                class="talent-node pixel-press d-flex flex-column align-center justify-center"
                                :class="nodeClass(node)"
                                @click="selectNode(node)"
                            >
                                <v-icon
                                    v-if="nodeState(node) === 'locked'"
                                    icon="mdi-lock-outline"
                                    size="16"
                                    class="mb-1"
                                />
                                <div class="font-pixel talent-node__name">
                                    {{ node.name }}
                                </div>
                                <div class="talent-node__rank text-caption">
                                    {{ rankOf(node.nodeId) }}/{{ node.maxRank }}
                                </div>
                                <div
                                    v-if="rankOf(node.nodeId) > 0"
                                    class="talent-node__effect text-caption"
                                >
                                    {{ nodeEffectSummary(node) }}
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <!-- 節點詳情 dialog -->
        <GameCommonDialogFrame
            v-model="detailOpen"
            max-width="320"
        >
            <template v-if="selectedNode">
                <div class="font-pixel text-body-1 mb-1" style="color: rgb(var(--v-theme-primary));">
                    {{ selectedNode.name }}
                </div>
                <div class="text-caption text-medium-emphasis mb-2">
                    Tier {{ selectedNode.tier }} · {{ rankOf(selectedNode.nodeId) }}/{{ selectedNode.maxRank }}
                </div>
                <p class="text-body-2 text-medium-emphasis mb-3">
                    {{ selectedNode.description }}
                </p>

                <!-- 3 階段進度：每個節點固定 3 級，每一格代表一級，已投入的級數
                     呈現充能光暈感；格內文字是「該級為止累積的加成」（{stat}+N）。 -->
                <v-row
                    dense
                    class="mb-3"
                >
                    <v-col
                        v-for="stage in 3"
                        :key="stage"
                        cols="4"
                    >
                        <div
                            class="talents-page__stage d-flex flex-column align-center justify-center"
                            :class="{ 'talents-page__stage--charged': stage <= rankOf(selectedNode.nodeId) }"
                        >
                            <div
                                v-for="effect in selectedNode.effect"
                                :key="effect.stat"
                                class="talents-page__stage-line font-pixel"
                            >
                                {{ STAT_LABEL[effect.stat] }}{{ formatEffectAtRank(effect, stage) }}
                            </div>
                        </div>
                    </v-col>
                </v-row>

                <div
                    v-if="nodeState(selectedNode) === 'locked'"
                    class="text-caption text-medium-emphasis mb-3"
                >
                    <v-icon
                        icon="mdi-lock-outline"
                        size="14"
                        class="mr-1"
                    />
                    {{ lockedReason(selectedNode) }}
                </div>

                <SystemBtn
                    block
                    color="primary"
                    class="text-none mb-2"
                    :disabled="!canInvest(selectedNode) || allocating"
                    @click="invest(selectedNode)"
                >
                    {{ investLabel(selectedNode) }}
                </SystemBtn>

                <SystemBtn
                    block
                    variant="outlined"
                    color="primary"
                    class="text-none"
                    :disabled="allocating"
                    @click="detailOpen = false"
                >
                    關閉
                </SystemBtn>
            </template>
        </GameCommonDialogFrame>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
    middleware: ['auth'],
    layout: 'game',
});

useHead({
    title: '天賦',
    meta: [{ name: 'description', content: 'GkBot Adventure Run 天賦樹頁面' }],
});

type TalentStat = 'ATK' | 'DEF' | 'HP_MAX' | 'actionIntervalSec' | 'critChance' | 'dodgeChance' | 'carryCapacity';

type TalentEffect = { stat: TalentStat; perRank: number };
type TalentNode = {
    nodeId: string;
    archetypeId: string;
    tier: number;
    branchGroup?: string;
    name: string;
    description: string;
    maxRank: number;
    effect: TalentEffect[];
};

const {
    character, loading, error, fetchCharacter, allocateTalent,
} = useCharacter();

// 天賦點的主色統一用黃色（characterStage.vue 的 LV 標籤同色），
// 與屬性點沿用的 warning（暗紅）區分開來。
const TALENT_POINT_COLOR = '#ffd166';

onMounted(() => {
    if (!character.value) fetchCharacter();
});

// 進入頁面時的預設捲動位置:有已投入的天賦時捲到目前進度最高的那一層
// (最新一個啟用的天賦),否則捲到 Tier 1(天賦樹的基礎層)。只需在資料
// 就緒後執行一次,之後投點造成的 re-render 不應該再次搶走使用者的捲動位置。
const tierElRefs = new Map<number, HTMLElement>();
const setTierRef = (tier: number) => (el: Element | null) => {
    if (el) tierElRefs.set(tier, el as HTMLElement);
};

const scrolledToDefault = ref(false);

const scrollToDefaultTier = async () => {
    if (scrolledToDefault.value || !character.value) return;
    scrolledToDefault.value = true;

    await nextTick();

    const nodes = character.value.talentTree.nodes;
    const investedTiers = nodes
        .filter(n => (character.value!.talents[n.nodeId] ?? 0) > 0)
        .map(n => n.tier);
    const targetTier = investedTiers.length > 0 ? Math.max(...investedTiers) : 1;

    tierElRefs.get(targetTier)?.scrollIntoView({ block: 'center' });
};

watch(character, (value) => {
    if (value) scrollToDefaultTier();
}, { immediate: true });

const STAT_LABEL: Record<TalentStat, string> = {
    ATK: '攻擊力',
    DEF: '防禦力',
    HP_MAX: '生命值',
    actionIntervalSec: '攻速',
    critChance: '爆擊',
    dodgeChance: '閃避',
    carryCapacity: '負重',
};

const isPercentStat = (stat: TalentStat) => stat === 'critChance' || stat === 'dodgeChance';

// 天賦樹畫面由上到下依序是 Tier 5 -> Tier 1（Tier 1 為基礎，永遠開放，畫在最下方）
const tiers = computed(() => {
    const nodes = character.value?.talentTree.nodes ?? [];
    const byTier = new Map<number, TalentNode[]>();
    for (const node of nodes) {
        const list = byTier.get(node.tier) ?? [];
        list.push(node);
        byTier.set(node.tier, list);
    }
    return [...byTier.entries()]
        .sort(([a], [b]) => b - a)
        .map(([tier, tierNodes]) => ({ tier, nodes: tierNodes }));
});

const rankOf = (nodeId: string) => character.value?.talents[nodeId] ?? 0;

const isMaxed = (node: TalentNode) => rankOf(node.nodeId) >= node.maxRank;

const tierOpen = (tier: number) => {
    if (tier === 1) return true;
    const nodes = character.value?.talentTree.nodes ?? [];
    return nodes.some(n => n.tier === tier - 1 && rankOf(n.nodeId) >= n.maxRank);
};

const opposingBranchNode = (node: TalentNode) => {
    if (!node.branchGroup) return undefined;
    const nodes = character.value?.talentTree.nodes ?? [];
    return nodes.find(n => n.tier === node.tier && n.branchGroup === node.branchGroup && n.nodeId !== node.nodeId);
};

// 只鎖定「還沒投過本節點、但對向分支已經投入」的狀態——已選定的分支本身不會被自己鎖住。
const branchLocked = (node: TalentNode) => {
    const opposing = opposingBranchNode(node);
    return Boolean(opposing) && rankOf(node.nodeId) === 0 && rankOf(opposing!.nodeId) > 0;
};

type NodeState = 'maxed' | 'locked' | 'investable' | 'available';

const nodeState = (node: TalentNode): NodeState => {
    if (isMaxed(node)) return 'maxed';
    if (!tierOpen(node.tier) || branchLocked(node)) return 'locked';
    if ((character.value?.talentPoints ?? 0) >= 1) return 'investable';
    return 'available';
};

const nodeClass = (node: TalentNode) => {
    const state = nodeState(node);
    return {
        'talent-node--invested': rankOf(node.nodeId) > 0,
        'talent-node--maxed': state === 'maxed',
        'talent-node--locked': state === 'locked',
        'talent-node--investable': state === 'investable',
    };
};

const canInvest = (node: TalentNode) => nodeState(node) === 'investable';

const lockedReason = (node: TalentNode) => {
    if (!tierOpen(node.tier)) return `需先將 Tier ${node.tier - 1} 的節點投滿`;
    if (branchLocked(node)) return '已投入對向分支，此節點永久鎖定';
    return '目前無法投點';
};

const investLabel = (node: TalentNode) => {
    if (isMaxed(node)) return '已滿級';
    if (nodeState(node) === 'locked') return '尚未開放';
    if ((character.value?.talentPoints ?? 0) < 1) return '天賦點不足';
    return '投入 1 點';
};

// 節點詳情 dialog 的 3 階段進度格：第 rank 格顯示「投到這一級為止」累積的
// 加成（perRank * rank），與角色目前實際 stats 無關,純粹是這個節點本身的
// 固定數值表（3 級為滿,見 talentTrees.ts）。
const formatEffectAtRank = (effect: TalentEffect, rank: number) => {
    const total = effect.perRank * rank;
    if (isPercentStat(effect.stat)) {
        const percent = Math.round(total * 100);
        return `${percent >= 0 ? '+' : ''}${percent}%`;
    }
    if (effect.stat === 'actionIntervalSec') {
        // Negative perRank means faster; show as a speed gain (positive reads as "faster").
        return `${-total >= 0 ? '+' : ''}${(-total).toFixed(2)}s`;
    }
    return `${total >= 0 ? '+' : ''}${total}`;
};

// 天賦樹卡片上已投入節點的加成摘要（例如「爆擊+5%」），多個效果以空白分隔。
const nodeEffectSummary = (node: TalentNode) => {
    const rank = rankOf(node.nodeId);
    return node.effect
        .map(effect => `${STAT_LABEL[effect.stat]}${formatEffectAtRank(effect, rank)}`)
        .join(' ');
};

const detailOpen = ref(false);
const selectedNode = ref<TalentNode | null>(null);
const allocating = ref(false);

const selectNode = (node: TalentNode) => {
    selectedNode.value = node;
    detailOpen.value = true;
};

const invest = async (node: TalentNode) => {
    if (!canInvest(node)) return;
    allocating.value = true;
    const ok = await allocateTalent(node.nodeId);
    allocating.value = false;
    if (ok) {
        // 重新取得的節點資料（rank 已更新）— 保持 dialog 開啟以便連續投點。
        selectedNode.value = character.value?.talentTree.nodes.find(n => n.nodeId === node.nodeId) ?? null;
    }
};
</script>

<style scoped lang="scss">
.talents-page {
    width: 100%;
    overflow: hidden;

    &__box {
        padding: 10px 12px;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;

        &--fixed {
            flex: 0 0 auto;
        }
    }

    &__scroll {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
    }

    &__tree {
        gap: 10px;
        padding-bottom: 12px;
    }

    &__tier-label {
        margin-bottom: 4px;
        text-align: center;
    }

    &__tier-nodes {
        gap: 8px;
    }

    &__stage {
        padding: 8px 6px;
        gap: 2px;
        text-align: center;
        background: rgba(196, 203, 219, 0.04);
        border: 1px solid rgba(196, 203, 219, 0.15);
        border-radius: 3px;
        opacity: 0.5;
        transition: opacity 0.15s ease-out;

        &--charged {
            opacity: 1;
            border-color: rgb(var(--v-theme-green));
            background: rgba(129, 178, 154, 0.12);
            box-shadow:
                0 0 8px rgba(129, 178, 154, 0.55),
                inset 0 0 6px rgba(129, 178, 154, 0.35);
            animation: talent-stage-glow 1.8s ease-in-out infinite;

            .talents-page__stage-line {
                color: rgb(var(--v-theme-green));
            }
        }
    }

    &__stage-line {
        font-size: 10px;
        line-height: 1.4;
        white-space: nowrap;
        color: rgb(var(--v-theme-primary));
    }
}

@keyframes talent-stage-glow {
    0%, 100% {
        box-shadow:
            0 0 8px rgba(129, 178, 154, 0.55),
            inset 0 0 6px rgba(129, 178, 154, 0.35);
    }
    50% {
        box-shadow:
            0 0 14px rgba(129, 178, 154, 0.85),
            inset 0 0 10px rgba(129, 178, 154, 0.55);
    }
}

.talent-node {
    flex: 1 1 0;
    max-width: 220px;
    min-height: 92px;
    gap: 2px;
    padding: 10px 8px;
    border: 2px solid rgba(196, 203, 219, 0.25);
    border-radius: 4px;
    background: #14171c;
    color: rgb(var(--v-theme-primary));
    opacity: 0.55;
    cursor: pointer;

    &__name {
        font-size: 15px;
        text-align: center;
    }

    &__rank {
        opacity: 0.8;
    }

    &__effect {
        margin-top: 2px;
        color: rgb(var(--v-theme-green));
        text-align: center;
    }

    &--investable {
        opacity: 1;
        border-color: rgb(var(--v-theme-warning));
    }

    &--invested {
        opacity: 1;
        border-color: rgb(var(--v-theme-green));
        color: rgb(var(--v-theme-green));
    }

    &--maxed {
        opacity: 1;
        border-color: rgb(var(--v-theme-green));
        color: rgb(var(--v-theme-green));
        background: rgba(var(--v-theme-green), 0.08);
    }

    &--locked {
        opacity: 0.35;
    }
}
</style>
