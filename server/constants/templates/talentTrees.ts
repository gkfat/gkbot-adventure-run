/**
 * Per-archetype talent trees (character-talents): each of the 5 selectable
 * archetypes gets exactly one static TalentTree — 5 tiers, tier 1/3/5 have a
 * single node, tier 2/4 are a mutually-exclusive branch pair (`branchGroup`),
 * every node maxRank 3. See design.md decision 6 for the source numbers.
 *
 * Node/description copy follows docs/worldview.md's narrative rule: GK
 * universe lore can be stated openly, but any hint of the player's own
 * mechanization stays implicit.
 */

import type { TalentTree } from '../../shared/types/character';

export const TALENT_TREES: Record<string, TalentTree> = {
    fighter: {
        archetypeId: 'fighter',
        nodes: [
            {
                nodeId: 'fighter_t1', archetypeId: 'fighter', tier: 1, name: '體魄鍛鍊', description: '一次又一次深入廢墟後，身體反而越練越硬。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'HP_MAX', perRank: 15, 
                    },
                    {
                        stat: 'DEF', perRank: 2, 
                    },
                    {
                        stat: 'carryCapacity', perRank: 1, 
                    },
                ],
            },
            {
                nodeId: 'fighter_t2a', archetypeId: 'fighter', tier: 2, branchGroup: 'fighter_t2', name: '剛毅意志', description: '再重的打擊也咬牙撐下去，久了，好像真的比較撐得住。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'DEF', perRank: 3, 
                    },
                ],
            },
            {
                nodeId: 'fighter_t2b', archetypeId: 'fighter', tier: 2, branchGroup: 'fighter_t2', name: '蠻力衝擊', description: '拳頭砸下去的力道，自己都覺得有點不像以前的自己。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'ATK', perRank: 3, 
                    },
                ],
            },
            {
                nodeId: 'fighter_t3', archetypeId: 'fighter', tier: 3, name: '沉重打擊', description: '找到了兼顧攻防的節奏，一擊比一擊沉。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'ATK', perRank: 2, 
                    }, {
                        stat: 'DEF', perRank: 1, 
                    },
                ],
            },
            {
                nodeId: 'fighter_t4a', archetypeId: 'fighter', tier: 4, branchGroup: 'fighter_t4', name: '銅牆鐵壁', description: '站定不動，讓對手的攻擊撞上來也毫無破綻。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'DEF', perRank: 5, 
                    }, {
                        stat: 'actionIntervalSec', perRank: 0.05, 
                    },
                ],
            },
            {
                nodeId: 'fighter_t4b', archetypeId: 'fighter', tier: 4, branchGroup: 'fighter_t4', name: '破陣猛攻', description: '不給對手喘息機會，一路壓著打。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'ATK', perRank: 5, 
                    },
                ],
            },
            {
                nodeId: 'fighter_t5', archetypeId: 'fighter', tier: 5, name: '不屈之軀', description: '這具身體到底承受過多少次瀕死，連自己都數不清了。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'HP_MAX', perRank: 40, 
                    }, {
                        stat: 'DEF', perRank: 4, 
                    },
                ],
            },
        ],
    },
    adventurer: {
        archetypeId: 'adventurer',
        nodes: [
            {
                nodeId: 'adventurer_t1', archetypeId: 'adventurer', tier: 1, name: '輕裝疾行', description: '把身上的裝備收拾得剛剛好，走起路來又輕又快。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'actionIntervalSec', perRank: -0.03, 
                    }, {
                        stat: 'dodgeChance', perRank: 0.01, 
                    },
                ],
            },
            {
                nodeId: 'adventurer_t2a', archetypeId: 'adventurer', tier: 2, branchGroup: 'adventurer_t2', name: '靈巧步伐', description: '危險逼近前,身體已經先一步閃開了。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'dodgeChance', perRank: 0.02, 
                    },
                ],
            },
            {
                nodeId: 'adventurer_t2b', archetypeId: 'adventurer', tier: 2, branchGroup: 'adventurer_t2', name: '疾風連擊', description: '出手的節奏越來越快,快到自己都跟不上思考。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'actionIntervalSec', perRank: -0.05, 
                    },
                ],
            },
            {
                nodeId: 'adventurer_t3', archetypeId: 'adventurer', tier: 3, name: '隨機應變', description: '該扛的、該躲的,一眼就能判斷,行囊也塞得下更多東西。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'carryCapacity', perRank: 2, 
                    }, {
                        stat: 'dodgeChance', perRank: 0.01, 
                    },
                ],
            },
            {
                nodeId: 'adventurer_t4a', archetypeId: 'adventurer', tier: 4, branchGroup: 'adventurer_t4', name: '影步', description: '腳步聲輕得連自己都懷疑是不是踩在地上。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'dodgeChance', perRank: 0.04, 
                    },
                ],
            },
            {
                nodeId: 'adventurer_t4b', archetypeId: 'adventurer', tier: 4, branchGroup: 'adventurer_t4', name: '迅捷本能', description: '身體比腦袋更早做出反應,快到近乎不假思索。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'actionIntervalSec', perRank: -0.08, 
                    },
                ],
            },
            {
                nodeId: 'adventurer_t5', archetypeId: 'adventurer', tier: 5, name: '探索者之心', description: '走過這麼多廢墟,危險與機會,一眼就能分清。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'ATK', perRank: 3, 
                    }, {
                        stat: 'dodgeChance', perRank: 0.02, 
                    },
                ],
            },
        ],
    },
    scholar: {
        archetypeId: 'scholar',
        nodes: [
            {
                nodeId: 'scholar_t1', archetypeId: 'scholar', tier: 1, name: '戰術洞察', description: '記下對手每個破綻,下手總能精準一些。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'critChance', perRank: 0.02, 
                    }, {
                        stat: 'ATK', perRank: 2, 
                    },
                ],
            },
            {
                nodeId: 'scholar_t2a', archetypeId: 'scholar', tier: 2, branchGroup: 'scholar_t2', name: '精準打擊', description: '弱點在哪裡,幾乎不用想就知道。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'critChance', perRank: 0.03, 
                    },
                ],
            },
            {
                nodeId: 'scholar_t2b', archetypeId: 'scholar', tier: 2, branchGroup: 'scholar_t2', name: '弱點分析', description: '把研究出的規律直接化為攻擊力道。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'ATK', perRank: 4, 
                    },
                ],
            },
            {
                nodeId: 'scholar_t3', archetypeId: 'scholar', tier: 3, name: '冷靜分析', description: '越是混亂的場面,思路反而越清楚。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'DEF', perRank: 2, 
                    }, {
                        stat: 'critChance', perRank: 0.01, 
                    },
                ],
            },
            {
                nodeId: 'scholar_t4a', archetypeId: 'scholar', tier: 4, branchGroup: 'scholar_t4', name: '致命一擊', description: '每一次出手,都瞄準了最致命的位置。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'critChance', perRank: 0.05, 
                    },
                ],
            },
            {
                nodeId: 'scholar_t4b', archetypeId: 'scholar', tier: 4, branchGroup: 'scholar_t4', name: '博學強化', description: '累積的知識,不知不覺化成了實實在在的力量。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'ATK', perRank: 6, 
                    },
                ],
            },
            {
                nodeId: 'scholar_t5', archetypeId: 'scholar', tier: 5, name: '大師手筆', description: '這份對戰局的掌握,連自己都覺得不太像原本的自己。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'ATK', perRank: 5, 
                    }, {
                        stat: 'critChance', perRank: 0.03, 
                    },
                ],
            },
        ],
    },
    tinkerer: {
        archetypeId: 'tinkerer',
        nodes: [
            {
                nodeId: 'tinkerer_t1', archetypeId: 'tinkerer', tier: 1, name: '裝備強化', description: '順手把身上的裝備調校得更順手一些。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'DEF', perRank: 2, 
                    }, {
                        stat: 'actionIntervalSec', perRank: -0.02, 
                    },
                ],
            },
            {
                nodeId: 'tinkerer_t2a', archetypeId: 'tinkerer', tier: 2, branchGroup: 'tinkerer_t2', name: '加固護甲', description: '莫名其妙就是知道哪裡該補強,補完就是硬。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'DEF', perRank: 4, 
                    },
                ],
            },
            {
                nodeId: 'tinkerer_t2b', archetypeId: 'tinkerer', tier: 2, branchGroup: 'tinkerer_t2', name: '潤滑機構', description: '關節上一點機油,動作就是滑順了不少。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'actionIntervalSec', perRank: -0.04, 
                    },
                ],
            },
            {
                nodeId: 'tinkerer_t3', archetypeId: 'tinkerer', tier: 3, name: '隨行工具', description: '工具包越塞越滿,連自己都佩服自己怎麼裝得下。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'carryCapacity', perRank: 3, 
                    }, {
                        stat: 'HP_MAX', perRank: 10, 
                    },
                ],
            },
            {
                nodeId: 'tinkerer_t4a', archetypeId: 'tinkerer', tier: 4, branchGroup: 'tinkerer_t4', name: '重裝改造', description: '把整套裝備拆了又裝,防禦力硬是多擠出一截。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'DEF', perRank: 6, 
                    },
                ],
            },
            {
                nodeId: 'tinkerer_t4b', archetypeId: 'tinkerer', tier: 4, branchGroup: 'tinkerer_t4', name: '高速齒輪', description: '換上自己調校過的齒輪,動作快得連自己都嚇一跳。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'actionIntervalSec', perRank: -0.06, 
                    },
                ],
            },
            {
                nodeId: 'tinkerer_t5', archetypeId: 'tinkerer', tier: 5, name: '巧匠傑作', description: '這身裝備已經被改得面目全非,卻比原廠的還好用。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'DEF', perRank: 5, 
                    }, {
                        stat: 'actionIntervalSec', perRank: -0.05, 
                    },
                ],
            },
        ],
    },
    gambler: {
        archetypeId: 'gambler',
        nodes: [
            {
                nodeId: 'gambler_t1', archetypeId: 'gambler', tier: 1, name: '幸運本能', description: '關鍵時刻,運氣總是莫名站在自己這邊。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'critChance', perRank: 0.02, 
                    }, {
                        stat: 'dodgeChance', perRank: 0.01, 
                    },
                ],
            },
            {
                nodeId: 'gambler_t2a', archetypeId: 'gambler', tier: 2, branchGroup: 'gambler_t2', name: '賭徒直覺', description: '該出手的瞬間,直覺總是準得離譜。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'critChance', perRank: 0.03, 
                    },
                ],
            },
            {
                nodeId: 'gambler_t2b', archetypeId: 'gambler', tier: 2, branchGroup: 'gambler_t2', name: '死裡逃生', description: '好幾次以為躲不掉了,身體卻自己閃了過去。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'dodgeChance', perRank: 0.03, 
                    },
                ],
            },
            {
                nodeId: 'gambler_t3', archetypeId: 'gambler', tier: 3, name: '孤注一擲', description: '把身家全押上去的那一刻,反而出手最準。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'ATK', perRank: 3, 
                    }, {
                        stat: 'critChance', perRank: 0.01, 
                    },
                ],
            },
            {
                nodeId: 'gambler_t4a', archetypeId: 'gambler', tier: 4, branchGroup: 'gambler_t4', name: '全下', description: '不留退路的打法,命中率高得不太合理。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'critChance', perRank: 0.05, 
                    },
                ],
            },
            {
                nodeId: 'gambler_t4b', archetypeId: 'gambler', tier: 4, branchGroup: 'gambler_t4', name: '命運女神', description: '千鈞一髮的閃避,次數多到讓人懷疑是不是運氣以外的東西。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'dodgeChance', perRank: 0.05, 
                    },
                ],
            },
            {
                nodeId: 'gambler_t5', archetypeId: 'gambler', tier: 5, name: '賭王之運', description: '走到這一步,已經分不清是運氣還是身體本身在幫自己作弊。',
                maxRank: 3,
                effect: [
                    {
                        stat: 'critChance', perRank: 0.03, 
                    }, {
                        stat: 'dodgeChance', perRank: 0.03, 
                    },
                ],
            },
        ],
    },
};

export function getTalentTreeByArchetypeId(archetypeId: string): TalentTree | undefined {
    return TALENT_TREES[archetypeId];
}
