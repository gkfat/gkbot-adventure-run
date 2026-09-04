/**
 * Event templates, organized by facility family (docs/worldview.md §2's six
 * facility types) then by EventType, plus the wheel's payout table.
 *
 * ASSUMPTION (see events-and-blessings/design.md): `10_事件祝福與詛咒.md`
 * doesn't exist in this repo — the concrete variant descriptions/choices
 * below, the per-family EventType weighting, and the wheel odds/choice costs
 * are invented for this change, themed after each facility family's flavor
 * in docs/worldview.md §2.
 *
 * Picking an event is a three-stage weighted draw (pickEventTemplate):
 * 1. facility family — one RNG draw, equal weight across all families (the
 *    run has no persisted "current facility" state to key off of).
 * 2. EventType within that family — shared fixed weights (EVENT_TYPE_WEIGHTS)
 *    across every family; HEAL is excluded from the pool until
 *    `healEligible` (require-combat-before-heal, same rule as REST's
 *    require-combat-before-rest — see adventure-run.service.ts's
 *    weightedNodePoolExcludingStreak).
 * 3. one of that (family, EventType) pair's 3~5 variants — equal weight.
 */

import { EventType } from '../../../shared/types/adventure';

export type EventChoiceDefinition = {
    label: string;
    // 'RISK' rolls one RNG draw to decide success/failure; 'SAFE' always succeeds.
    kind: 'RISK' | 'SAFE';
    goldOnSuccess?: number;
    riskCurseOnFailure?: boolean;
};

export type EventTemplate = {
    id: string;
    type: EventType;
    description: string;
    healPercent?: number; // HEAL only
    choices?: EventChoiceDefinition[]; // CHOICE only
};

type FacilityFamilyId = 'supply' | 'research' | 'maintenance' | 'vr' | 'entertainment' | 'convenience';

type FacilityFamily = {
    id: FacilityFamilyId;
    name: string; // docs/worldview.md §2 facility type name
    eventsByType: Record<EventType, EventTemplate[]>; // each list holds 3~5 variants
};

// Shared across every facility family: choice 20%, wheel 15%, blessing/curse
// split the remainder evenly, heal kept the smallest share (see design note
// above — HEAL is a "nice to have" relief, not a primary event outcome).
export const EVENT_TYPE_WEIGHTS: Record<EventType, number> = {
    [EventType.CHOICE]: 20,
    [EventType.WHEEL]: 15,
    [EventType.HEAL]: 5,
    [EventType.BLESSING]: 30,
    [EventType.CURSE]: 30,
};

export const FACILITY_FAMILIES: FacilityFamily[] = [
    {
        id: 'supply',
        name: '補給設施',
        eventsByType: {
            [EventType.HEAL]: [
                {
                    id: 'supply_medkit_pallet', type: EventType.HEAL, description: '貨架上一箱過期但仍堪用的急救包被你翻了出來。', healPercent: 15,
                },
                {
                    id: 'supply_ration_crate', type: EventType.HEAL, description: '民生物資堆裡混著幾罐尚未過期的營養補給品，你就地補充。', healPercent: 12,
                },
                {
                    id: 'supply_autoclinic_kiosk', type: EventType.HEAL, description: '自動販賣機的醫療專區還在運作，你刷了張撿來的員工卡換到一劑通用藥劑。', healPercent: 18,
                },
            ],
            [EventType.BLESSING]: [
                {
                    id: 'supply_prototype_gear_crate', type: EventType.BLESSING, description: '貨架深處一個未拆封的原型裝備箱，內裝說明書已經看不清楚。',
                },
                {
                    id: 'supply_beta_test_locker', type: EventType.BLESSING, description: '員工置物櫃裡放著測試用強化模組，似乎還沒正式上市。',
                },
                {
                    id: 'supply_returns_bin', type: EventType.BLESSING, description: '退貨區堆著一批「瑕疵品」，但拆開後功能完好得可疑。',
                },
            ],
            [EventType.CURSE]: [
                {
                    id: 'supply_leaking_canister', type: EventType.CURSE, description: '一桶標示不明的化學物質在你經過時破裂噴濺。',
                },
                {
                    id: 'supply_rogue_forklift', type: EventType.CURSE, description: '失控的搬運機具突然朝你衝來，你勉強閃避但還是被刮傷。',
                },
                {
                    id: 'supply_expired_stim', type: EventType.CURSE, description: '你誤食了一罐早已變質的補給品，感覺不太對勁。',
                },
            ],
            [EventType.WHEEL]: [
                {
                    id: 'supply_vending_glitch', type: EventType.WHEEL, description: '一台故障的自動販賣機開始瘋狂吐出物資，你決定碰碰運氣按下按鈕。',
                },
                {
                    id: 'supply_lucky_pallet', type: EventType.WHEEL, description: '一個貼著彩色貼紙的神秘棧板，內容物似乎是隨機分配的。',
                },
                {
                    id: 'supply_lottery_terminal', type: EventType.WHEEL, description: '倉儲管理系統的員工抽獎終端機依然亮著燈。',
                },
            ],
            [EventType.CHOICE]: [
                {
                    id: 'sealed_crate',
                    type: EventType.CHOICE,
                    description: '一個上鎖的補給箱擋在路上，箱蓋貼著警告標語。',
                    choices: [
                        {
                            label: '強行打開', kind: 'RISK', goldOnSuccess: 30, riskCurseOnFailure: true,
                        }, {
                            label: '留下箱子離開', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'supply_locked_locker',
                    type: EventType.CHOICE,
                    description: '一排員工置物櫃，其中一個貼著醒目的「危險品」標籤但門鎖已鬆動。',
                    choices: [
                        {
                            label: '撬開查看', kind: 'RISK', goldOnSuccess: 35, riskCurseOnFailure: true,
                        }, {
                            label: '不要冒險', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'supply_forklift_wreck',
                    type: EventType.CHOICE,
                    description: '一台側翻的搬運車下方壓著看起來值錢的貨物。',
                    choices: [
                        {
                            label: '冒險搬出貨物', kind: 'RISK', goldOnSuccess: 40, riskCurseOnFailure: true,
                        }, {
                            label: '放棄離開', kind: 'SAFE', goldOnSuccess: 8,
                        },
                    ],
                },
            ],
        },
    },
    {
        id: 'research',
        name: '研究設施',
        eventsByType: {
            [EventType.HEAL]: [
                {
                    id: 'research_nanite_pod', type: EventType.HEAL, description: '半損壞的奈米修復艙自動啟動，銀色霧氣包裹住你的傷口。', healPercent: 25,
                },
                {
                    id: 'research_gel_bath', type: EventType.HEAL, description: '實驗用凝膠槽殘留著恆溫藥液，你將傷口浸入其中。', healPercent: 15,
                },
                {
                    id: 'research_synth_serum', type: EventType.HEAL, description: '你在培養皿架上找到一劑標示不明的合成血清並注射。', healPercent: 20,
                },
            ],
            [EventType.BLESSING]: [
                {
                    id: 'research_terminal', type: EventType.BLESSING, description: '研究設施的終端機還亮著，似乎在提供什麼強化協議。',
                },
                {
                    id: 'research_gene_splicer', type: EventType.BLESSING, description: '基因編輯裝置的操作介面自動彈出，邀請你進行一次強化程序。',
                },
                {
                    id: 'research_exosuit_rig', type: EventType.BLESSING, description: '一套實驗性強化骨骼正掛在充能架上，似乎在等待使用者。',
                },
            ],
            [EventType.CURSE]: [
                {
                    id: 'research_unstable_reagent', type: EventType.CURSE, description: '你不慎碰倒了一瓶未穩定化的實驗試劑。',
                },
                {
                    id: 'research_containment_breach', type: EventType.CURSE, description: '一個生物實驗艙的封印在你靠近時鬆脫。',
                },
                {
                    id: 'research_feedback_surge', type: EventType.CURSE, description: '監測儀器的能量回饋瞬間貫穿你的身體。',
                },
            ],
            [EventType.WHEEL]: [
                {
                    id: 'research_probability_engine', type: EventType.WHEEL, description: '一台標示著「機率實驗」的裝置邀請你參與一次測試。',
                },
                {
                    id: 'research_random_dispenser', type: EventType.WHEEL, description: '實驗室的隨機取樣機正在等待下一位受試者。',
                },
                {
                    id: 'research_anomaly_field', type: EventType.WHEEL, description: '一小片空間扭曲的異常力場，似乎會隨機吐出東西。',
                },
            ],
            [EventType.CHOICE]: [
                {
                    id: 'research_locked_vault',
                    type: EventType.CHOICE,
                    description: '一個上鎖的樣本保險櫃，警示燈閃爍不停。',
                    choices: [
                        {
                            label: '強行破解', kind: 'RISK', goldOnSuccess: 35, riskCurseOnFailure: true,
                        }, {
                            label: '轉身離開', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'research_test_subject_capsule',
                    type: EventType.CHOICE,
                    description: '一具休眠艙裡似乎還留著未取出的強化藥劑。',
                    choices: [
                        {
                            label: '打開休眠艙', kind: 'RISK', goldOnSuccess: 30, riskCurseOnFailure: true,
                        }, {
                            label: '不要打擾它', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'research_data_core',
                    type: EventType.CHOICE,
                    description: '一顆閃著微光的資料核心，裡面可能藏著有價值的研究成果。',
                    choices: [
                        {
                            label: '強行拔取', kind: 'RISK', goldOnSuccess: 40, riskCurseOnFailure: true,
                        }, {
                            label: '留在原處', kind: 'SAFE', goldOnSuccess: 8,
                        },
                    ],
                },
            ],
        },
    },
    {
        id: 'maintenance',
        name: '維修設施',
        eventsByType: {
            [EventType.HEAL]: [
                {
                    id: 'maintenance_coolant_pool', type: EventType.HEAL, description: '設施深處殘留的冷卻循環液散發溫熱氣息，你將傷處浸入其中緩解痛楚。', healPercent: 15,
                },
                {
                    id: 'maintenance_repair_bay', type: EventType.HEAL, description: '一座機具維修台的醫療模組被你意外啟動。', healPercent: 18,
                },
                {
                    id: 'maintenance_lubricant_wash', type: EventType.HEAL, description: '溫熱的潤滑液噴淋系統意外對你的傷口起了舒緩作用。', healPercent: 10,
                },
            ],
            [EventType.BLESSING]: [
                {
                    id: 'maintenance_upgrade_rig', type: EventType.BLESSING, description: '一具維修用機械臂正握著一件看起來能強化裝備的模組。',
                },
                {
                    id: 'maintenance_spare_parts_bin', type: EventType.BLESSING, description: '零件箱裡混著幾個品相完好的稀有強化元件。',
                },
                {
                    id: 'maintenance_diagnostic_station', type: EventType.BLESSING, description: '診斷站的螢幕顯示你的裝備仍有升級空間，並提供了協助。',
                },
            ],
            [EventType.CURSE]: [
                {
                    id: 'maintenance_malfunctioning_unit', type: EventType.CURSE, description: '一台失控的維修機具突然對你噴出不明氣體。',
                },
                {
                    id: 'maintenance_sparking_wire', type: EventType.CURSE, description: '裸露的電線突然打火，電流竄過你的身體。',
                },
                {
                    id: 'maintenance_falling_debris', type: EventType.CURSE, description: '天花板的維修支架鬆脫，砸落的殘骸擦過你。',
                },
            ],
            [EventType.WHEEL]: [
                {
                    id: 'maintenance_scrap_sorter', type: EventType.WHEEL, description: '一台自動分類機隨機吐出回收零件，你決定試著操作它。',
                },
                {
                    id: 'maintenance_arcade_claw', type: EventType.WHEEL, description: '不知為何這裡擺著一台故障的夾娃娃機，爪子還在動。',
                },
                {
                    id: 'maintenance_spin_dispenser', type: EventType.WHEEL, description: '維修站的獎勵轉盤系統似乎還在運作。',
                },
            ],
            [EventType.CHOICE]: [
                {
                    id: 'maintenance_locked_toolbox',
                    type: EventType.CHOICE,
                    description: '一個上鎖的工具箱，貼著危險警告貼紙。',
                    choices: [
                        {
                            label: '撬開工具箱', kind: 'RISK', goldOnSuccess: 30, riskCurseOnFailure: true,
                        }, {
                            label: '不去理會', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'maintenance_jammed_hatch',
                    type: EventType.CHOICE,
                    description: '一扇卡住的維修艙門，後方似乎藏著東西。',
                    choices: [
                        {
                            label: '硬撬艙門', kind: 'RISK', goldOnSuccess: 35, riskCurseOnFailure: true,
                        }, {
                            label: '放棄離開', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'maintenance_overloaded_panel',
                    type: EventType.CHOICE,
                    description: '一面過載的控制面板，強行操作可能有風險。',
                    choices: [
                        {
                            label: '強行操作', kind: 'RISK', goldOnSuccess: 40, riskCurseOnFailure: true,
                        }, {
                            label: '不要碰它', kind: 'SAFE', goldOnSuccess: 8,
                        },
                    ],
                },
            ],
        },
    },
    {
        id: 'vr',
        name: '虛擬實境設施',
        eventsByType: {
            [EventType.HEAL]: [
                {
                    id: 'vr_simulated_medbay', type: EventType.HEAL, description: '模擬空間投射出一間虛假的醫療室，但注射的藥劑卻是真實的。', healPercent: 15,
                },
                {
                    id: 'vr_dream_recovery', type: EventType.HEAL, description: '扭曲的模擬場景讓你陷入短暫的假寐，醒來後傷勢竟然好轉了。', healPercent: 12,
                },
                {
                    id: 'vr_training_nanobot', type: EventType.HEAL, description: '訓練用奈米機器人誤把你當成受訓者，開始執行修復程序。', healPercent: 20,
                },
            ],
            [EventType.BLESSING]: [
                {
                    id: 'vr_training_module', type: EventType.BLESSING, description: '一段訓練程式似乎誤把你辨識為授權學員，開始傳輸強化資料。',
                },
                {
                    id: 'vr_simulated_mentor', type: EventType.BLESSING, description: '一個虛擬教官的全息影像出現，宣稱要傳授你一項「隱藏技能」。',
                },
                {
                    id: 'vr_reality_glitch_gift', type: EventType.BLESSING, description: '現實與模擬邊界的裂縫中，掉出一件不該存在於此的裝備。',
                },
            ],
            [EventType.CURSE]: [
                {
                    id: 'vr_reality_collapse', type: EventType.CURSE, description: '現實與模擬的邊界突然崩壞，扭曲的畫面讓你感到一陣暈眩劇痛。',
                },
                {
                    id: 'vr_phantom_attacker', type: EventType.CURSE, description: '一個不存在的幻影敵人揮出了真實的一擊。',
                },
                {
                    id: 'vr_feedback_loop', type: EventType.CURSE, description: '訓練用的痛覺回饋系統故障，超載的訊號直衝你的神經。',
                },
            ],
            [EventType.WHEEL]: [
                {
                    id: 'vr_roulette', type: EventType.WHEEL, description: '扭曲的虛擬實境轉盤在你面前浮現，邀請你轉一次。',
                },
                {
                    id: 'vr_probability_simulation', type: EventType.WHEEL, description: '一場模擬機率測試的畫面在你眼前展開，邀請你參與。',
                },
                {
                    id: 'vr_glitched_slot', type: EventType.WHEEL, description: '故障的模擬空間隨機投射出一台老虎機。',
                },
            ],
            [EventType.CHOICE]: [
                {
                    id: 'vr_illusion_vault',
                    type: EventType.CHOICE,
                    description: '一座看似虛幻卻又觸感真實的保險箱懸浮在半空。',
                    choices: [
                        {
                            label: '伸手觸碰', kind: 'RISK', goldOnSuccess: 35, riskCurseOnFailure: true,
                        }, {
                            label: '保持距離', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'vr_paradox_door',
                    type: EventType.CHOICE,
                    description: '一扇不斷閃爍存在與否的門，門後似乎有東西。',
                    choices: [
                        {
                            label: '推門而入', kind: 'RISK', goldOnSuccess: 30, riskCurseOnFailure: true,
                        }, {
                            label: '轉身離開', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'vr_simulated_dare',
                    type: EventType.CHOICE,
                    description: '教官的全息影像出了一道「測試」，通過就有獎勵。',
                    choices: [
                        {
                            label: '接受測試', kind: 'RISK', goldOnSuccess: 40, riskCurseOnFailure: true,
                        }, {
                            label: '拒絕參加', kind: 'SAFE', goldOnSuccess: 8,
                        },
                    ],
                },
            ],
        },
    },
    {
        id: 'entertainment',
        name: '娛樂場所',
        eventsByType: {
            [EventType.HEAL]: [
                {
                    id: 'entertainment_firstaid_kiosk', type: EventType.HEAL, description: '遊樂設施旁的急救站意外還能運作，你領了一劑基本藥劑。', healPercent: 12,
                },
                {
                    id: 'entertainment_hottub_lounge', type: EventType.HEAL, description: 'KTV貴賓室的按摩浴缸還殘留溫水，你稍作休息緩解傷勢。', healPercent: 15,
                },
                {
                    id: 'entertainment_bar_firstaid', type: EventType.HEAL, description: '吧台後方藏著一個員工急救箱。', healPercent: 18,
                },
            ],
            [EventType.BLESSING]: [
                {
                    id: 'entertainment_jackpot_machine', type: EventType.BLESSING, description: '一台賭博機具突然大放異彩，吐出的不是代幣而是一件強化裝置。',
                },
                {
                    id: 'entertainment_vip_locker', type: EventType.BLESSING, description: 'VIP包廂的置物櫃裡放著一件疑似高級贈品的強化模組。',
                },
                {
                    id: 'entertainment_prize_counter', type: EventType.BLESSING, description: '遊樂園的兌獎櫃檯後還留著一件沒人領走的大獎。',
                },
            ],
            [EventType.CURSE]: [
                {
                    id: 'entertainment_malfunctioning_ride', type: EventType.CURSE, description: '一座失控的遊樂設施擦過你，留下一道瘀傷。',
                },
                {
                    id: 'entertainment_toxic_fog_machine', type: EventType.CURSE, description: '舞台特效用的煙霧機噴出的氣體聞起來不太對勁。',
                },
                {
                    id: 'entertainment_electrified_railing', type: EventType.CURSE, description: '一段裸露的霓虹燈電路意外電到了你。',
                },
            ],
            [EventType.WHEEL]: [
                {
                    id: 'entertainment_casino_wheel', type: EventType.WHEEL, description: '一台賭場輪盤仍在瘋狂轉動，邀請你下注一把。',
                },
                {
                    id: 'entertainment_claw_machine', type: EventType.WHEEL, description: '遊樂園的夾娃娃機故障大開，任君抓取。',
                },
                {
                    id: 'entertainment_slot_machine', type: EventType.WHEEL, description: '一台老虎機的拉桿還能運作，你決定拉一把。',
                },
            ],
            [EventType.CHOICE]: [
                {
                    id: 'entertainment_locked_safe',
                    type: EventType.CHOICE,
                    description: '賭場保險箱的鎖看起來鬆動了。',
                    choices: [
                        {
                            label: '硬撬保險箱', kind: 'RISK', goldOnSuccess: 35, riskCurseOnFailure: true,
                        }, {
                            label: '放棄離開', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'entertainment_backstage_crate',
                    type: EventType.CHOICE,
                    description: '後台的道具箱貼著「非請勿入」的標語。',
                    choices: [
                        {
                            label: '打開道具箱', kind: 'RISK', goldOnSuccess: 30, riskCurseOnFailure: true,
                        }, {
                            label: '不要冒險', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'entertainment_prize_capsule',
                    type: EventType.CHOICE,
                    description: '一顆卡在扭蛋機裡的大獎球，用力一敲或許能拿到。',
                    choices: [
                        {
                            label: '用力敲開', kind: 'RISK', goldOnSuccess: 40, riskCurseOnFailure: true,
                        }, {
                            label: '算了離開', kind: 'SAFE', goldOnSuccess: 8,
                        },
                    ],
                },
            ],
        },
    },
    {
        id: 'convenience',
        name: '小賣店',
        eventsByType: {
            [EventType.HEAL]: [
                {
                    id: 'convenience_pharmacy_shelf', type: EventType.HEAL, description: '貨架上還剩幾包沒過期的成藥。', healPercent: 10,
                },
                {
                    id: 'convenience_firstaid_rack', type: EventType.HEAL, description: '收銀台旁的小型急救架意外完好。', healPercent: 12,
                },
                {
                    id: 'convenience_energy_drink', type: EventType.HEAL, description: '冰櫃裡一罐效期內的機能飲料，喝下去感覺舒緩不少。', healPercent: 8,
                },
            ],
            [EventType.BLESSING]: [
                {
                    id: 'convenience_lucky_charm_display', type: EventType.BLESSING, description: '收銀台旁的幸運小物展示架，其中一件散發著微弱能量。',
                },
                {
                    id: 'convenience_limited_edition_item', type: EventType.BLESSING, description: '貨架深處一件從未拆封的限量商品，說明書寫著誇張的功效。',
                },
                {
                    id: 'convenience_staff_only_shelf', type: EventType.BLESSING, description: '「員工專用」的隱藏貨架上放著一件性能不明的強化小物。',
                },
            ],
            [EventType.CURSE]: [
                {
                    id: 'convenience_spoiled_food', type: EventType.CURSE, description: '你誤拿了一包早已腐壞的食品。',
                },
                {
                    id: 'convenience_broken_fridge', type: EventType.CURSE, description: '故障的冷凍櫃門突然彈開，砸中了你。',
                },
                {
                    id: 'convenience_shady_stranger', type: EventType.CURSE, description: '一個行跡可疑的人影從貨架後閃過，順手在你身上留下了什麼。',
                },
            ],
            [EventType.WHEEL]: [
                {
                    id: 'convenience_scratch_lottery', type: EventType.WHEEL, description: '收銀台旁還剩幾張刮刮樂彩券。',
                },
                {
                    id: 'convenience_gacha_machine', type: EventType.WHEEL, description: '店門口的扭蛋機還投得動，你決定試試手氣。',
                },
                {
                    id: 'convenience_raffle_box', type: EventType.WHEEL, description: '一個抽獎箱裡還剩幾張未開的獎券。',
                },
            ],
            [EventType.CHOICE]: [
                {
                    id: 'convenience_locked_register',
                    type: EventType.CHOICE,
                    description: '收銀台被鎖住了，但看起來不太牢固。',
                    choices: [
                        {
                            label: '撬開收銀台', kind: 'RISK', goldOnSuccess: 30, riskCurseOnFailure: true,
                        }, {
                            label: '不要冒險', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'convenience_backroom_door',
                    type: EventType.CHOICE,
                    description: '一扇貼著「請勿進入」的後門微微敞開。',
                    choices: [
                        {
                            label: '推門進去', kind: 'RISK', goldOnSuccess: 35, riskCurseOnFailure: true,
                        }, {
                            label: '轉身離開', kind: 'SAFE', goldOnSuccess: 5,
                        },
                    ],
                },
                {
                    id: 'convenience_delivery_box',
                    type: EventType.CHOICE,
                    description: '門口一箱還沒拆封的到貨包裹。',
                    choices: [
                        {
                            label: '拆開包裹', kind: 'RISK', goldOnSuccess: 40, riskCurseOnFailure: true,
                        }, {
                            label: '放著不管', kind: 'SAFE', goldOnSuccess: 8,
                        },
                    ],
                },
            ],
        },
    },
];

// Flattened view of every variant across every family — used for id lookups
// (e.g. re-resolving a stored `eventTemplateId` in event.service.ts).
export const EVENT_TEMPLATES: EventTemplate[] = FACILITY_FAMILIES.flatMap(
    family => Object.values(family.eventsByType).flat(),
);

/**
 * Pick an event template via the three-stage weighted draw described in this
 * file's header comment. Each roll is expected to be one independent RNG
 * draw in [0, 1).
 */
export function pickEventTemplate(
    familyRoll: number,
    typeRoll: number,
    variantRoll: number,
    healEligible: boolean,
): EventTemplate {
    const familyIndex = Math.min(Math.floor(familyRoll * FACILITY_FAMILIES.length), FACILITY_FAMILIES.length - 1);
    const family = FACILITY_FAMILIES[familyIndex] as FacilityFamily;

    const eligibleTypes = Object.values(EventType).filter(type => healEligible || type !== EventType.HEAL);
    const totalTypeWeight = eligibleTypes.reduce((sum, type) => sum + EVENT_TYPE_WEIGHTS[type], 0);
    const typeCursorTarget = typeRoll * totalTypeWeight;
    let typeCursor = 0;
    let selectedType = eligibleTypes[0] as EventType;
    for (const type of eligibleTypes) {
        typeCursor += EVENT_TYPE_WEIGHTS[type];
        if (typeCursorTarget < typeCursor) {
            selectedType = type;
            break;
        }
    }

    const variants = family.eventsByType[selectedType];
    const variantIndex = Math.min(Math.floor(variantRoll * variants.length), variants.length - 1);
    return variants[variantIndex] as EventTemplate;
}

// Wheel payout table — spec.md "事件轉盤": 3% gems (1~5), rest split gold/item.
export const WHEEL_GEMS_CHANCE = 0.03;
export const WHEEL_GEMS_MIN = 1;
export const WHEEL_GEMS_MAX = 5;
export const WHEEL_GOLD_CHANCE = 0.67; // cumulative window after gems: [0.03, 0.70)
export const WHEEL_ITEM_CHANCE = 0.15; // cumulative window after gold: [0.70, 0.85); remainder [0.85, 1.0) is no-win
export const WHEEL_RISK_CURSE_CHANCE = 0.5; // choice event's RISK failure odds
