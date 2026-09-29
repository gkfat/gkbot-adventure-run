<template>
    <div class="node-path">
        <div
            class="node-path__grid"
            :style="gridStyle"
        >
            <svg
                class="node-path__line"
                :viewBox="`0 0 100 ${gridHeight}`"
                preserveAspectRatio="none"
            >
                <polyline
                    :points="linePoints"
                    fill="none"
                    stroke="rgba(196, 203, 219, 0.35)"
                    stroke-width="2"
                    vector-effect="non-scaling-stroke"
                />
            </svg>
            <span
                v-for="n in nodes"
                :key="n.index"
                class="node-path__dot"
                :class="[
                    `node-path__dot--${(n.type ?? 'unexplored').toLowerCase()}`,
                    {
                        'node-path__dot--current': n.isCurrent,
                        'node-path__dot--boss': n.isBoss,
                    },
                ]"
                :style="dotStyle(n)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { AdventureStateType, NodeType } from '../../../../shared/types/adventure';

// BLESSING_SELECT 不是 NodeType（它是 AdventureStateType，沒有實際的敵人/
// 事件內容），但跟其他節點一樣會佔用一個 stage node 欄位，所以這裡用一個
// 額外的合成 kind 讓它也能在地圖上有專屬顏色。
const BLESSING_KIND = 'BLESSING_SELECT' as const;
type NodeKind = NodeType | typeof BLESSING_KIND;

const props = defineProps<{
    // Total node count for the current stage (currentRun.stageNodeCount)
    nodeCount: number;
    // 0-based index of the node the player is currently on (currentRun.stageNodeIndex)
    currentIndex: number;
    // Type of the node the player is currently on (currentRun.currentNodeType) —
    // undefined while state is BLESSING_SELECT (see currentState below)
    currentNodeType?: NodeType;
    // currentRun.state — only consulted to detect BLESSING_SELECT, since that
    // state has no NodeType of its own
    currentState?: AdventureStateType;
    // 伺服器持久化的每節點類型快照（currentRun.nodeTypeHistory，key 是
    // stageNodeIndex 字串）——用來在重新整理/斷線重連後還原已探索節點的
    // 顏色（見使用者回報：斷點繼續探索時，之前踩過的節點會變回灰色）。
    nodeTypeHistory?: Record<string, NodeKind>;
}>();

const COLUMNS = 10;
const CELL = 22;

// visitedTypes 以伺服器的 nodeTypeHistory 為主（含目前節點——它跟
// currentNodeType/currentState 在同一次 saveCheckpoint 寫入，所以一定同步）。
// 額外保留 currentIndex/currentNodeType/currentState 的即時 fallback，涵蓋
// nodeTypeHistory 欄位尚未補齊的舊 run 文件（migration）。
const visitedTypes = reactive<Record<number, NodeKind>>({});

watch(
    () => props.nodeTypeHistory,
    (history) => {
        if (!history) return;
        for (const [key, type] of Object.entries(history)) {
            visitedTypes[Number(key)] = type;
        }
    },
    { immediate: true, deep: true },
);

watch(
    () => [props.currentIndex, props.currentNodeType, props.currentState] as const,
    ([index, type, state]) => {
        if (index < 0) return;
        if (state === AdventureStateType.BLESSING_SELECT) {
            visitedTypes[index] = BLESSING_KIND;
        } else if (type) {
            visitedTypes[index] = type;
        }
    },
    { immediate: true },
);

type NodeDot = {
    index: number;
    row: number;
    col: number;
    isCurrent: boolean;
    isBoss: boolean;
    type?: NodeKind;
};

const columns = computed(() => Math.min(COLUMNS, Math.max(props.nodeCount, 1)));
const rowCount = computed(() => Math.ceil(props.nodeCount / columns.value));

// 蛇形排列（boustrophedon）：偶數列由左至右，奇數列由右至左，讓節點依索引
// 順序連續繞行、不需要跳回起點。
const nodes = computed<NodeDot[]>(() => {
    const cols = columns.value;
    const lastIndex = props.nodeCount - 1;

    return Array.from({ length: props.nodeCount }, (_, index) => {
        const row = Math.floor(index / cols);
        const colInRow = index % cols;
        const col = row % 2 === 0 ? colInRow : cols - 1 - colInRow;
        const isBoss = index === lastIndex;

        return {
            index,
            row,
            col,
            isCurrent: index === props.currentIndex,
            isBoss,
            type: isBoss ? NodeType.BOSS : visitedTypes[index],
        };
    });
});

const gridHeight = computed(() => rowCount.value * CELL);
const gridStyle = computed(() => ({
    height: `${gridHeight.value}px`,
}));

// x 用百分比（欄寬平均分配滿版寬度），y 維持固定 px（列高不隨寬度縮放）。
const centerOf = (n: NodeDot) => ({
    xPercent: (n.col + 0.5) / columns.value * 100,
    y: n.row * CELL + CELL / 2,
});

const linePoints = computed(() => nodes.value.map((n) => {
    const { xPercent, y } = centerOf(n);
    return `${xPercent},${y}`;
}).join(' '));

const dotStyle = (n: NodeDot) => {
    const { xPercent, y } = centerOf(n);
    return {
        left: `${xPercent}%`,
        top: `${y}px`,
    };
};
</script>

<style scoped lang="scss">
.node-path {
    &__grid {
        position: relative;
        width: 100%;
    }

    &__line {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    &__dot {
        position: absolute;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: #545a6b;
        border: 1px solid #454a59;
        image-rendering: pixelated;

        &--combat {
            background: #e76f51;
            border-color: #e76f51;
        }

        &--elite {
            background: #9b5de5;
            border-color: #9b5de5;
        }

        &--strong_elite {
            background: #c9184a;
            border-color: #c9184a;
        }

        &--event {
            background: #4cc9f0;
            border-color: #4cc9f0;
        }

        &--rest {
            background: #81b29a;
            border-color: #81b29a;
        }

        &--choice {
            background: #f4a261;
            border-color: #f4a261;
        }

        &--blessing_select {
            background: #ffd166;
            border-color: #ffd166;
        }

        &--boss {
            width: 13px;
            height: 13px;
            background: #ef233c;
            border-color: #ef233c;
            box-shadow: 0 0 4px rgba(239, 35, 60, 0.7);
        }

        &--current {
            box-shadow: 0 0 6px 3px rgba(255, 255, 255, 0.85);
        }
    }
}
</style>
