/**
 * Flavor text shown before entering a level (intro) and while advancing
 * between stages within a run (transition). Purely cosmetic frontend copy —
 * does not affect game state, so it is not driven by the run's seeded RNG.
 * Keyed by facility theme name (STAGE_CONFIG.FACILITY_THEMES in
 * shared/types/adventure.ts); falls back to DEFAULT_NARRATIVE for any
 * theme not listed here.
 */
type NarrativeSet = {
    intro: string[];
    transition: string[];
};

const DEFAULT_NARRATIVE: NarrativeSet = {
    intro: ['門後一片死寂，只有通風系統偶爾發出的嗡鳴。深吸一口氣，準備踏進去。', '這裡早就沒人住了，但貨架和機器可能還藏著值得帶走的東西——如果能活著出來的話。'],
    transition: ['腳步聲在空蕩的走廊裡格外清楚，前方還有多遠，誰也說不準。', '剛剛那一下太驚險了，得放慢腳步，仔細聽聽周圍還有沒有動靜。'],
};

const NARRATIVE_BY_THEME: Record<string, NarrativeSet> = {
    '廢棄補給站': {
        intro: ['貨架東倒西歪，過期標籤還貼在空空的罐頭上。這種地方，運氣好還能挖到幾罐沒被翻過的存糧。', '補給站的鐵捲門只拉開一半，裡頭黑得看不清，但貨物的輪廓還在——值得賭一把。'],
        transition: ['貨架之間堆滿雜物，得小心別踢翻什麼，驚動不該驚動的東西。', '空氣裡有股防腐劑的味道，混著別的什麼——最好加快腳步。'],
    },
    '廢棄研究所': {
        intro: ['玻璃門上還貼著生物安全警示標籤，褪色得快看不清了。裡面到底做過什麼實驗，沒人敢深想。', '走廊盡頭傳來規律的滴水聲，實驗設備多半還連著電，這代表危險——也代表有東西可拿。'],
        transition: ['牆上的標語寫著「保持冷靜、遵守流程」，如今聽起來格外諷刺。', '某個房間的燈還亮著，沒人知道是誰、或是什麼，忘了關。'],
    },
    '廢棄維修廠': {
        intro: ['生鏽的機械手臂懸在半空，像是隨時會重新啟動。這裡的零件值錢，前提是別吵醒不該吵醒的東西。', '油污和鐵鏽的味道撲面而來，維修廠的深處總藏著最好的戰利品——和最壞的驚喜。'],
        transition: ['腳下的金屬地板發出空洞的迴響，提醒著這座廠房有多大、多空。', '某條生產線似乎還在低速運轉，沒人知道它還在做什麼。'],
    },
    '崩壞VR體驗館': {
        intro: ['入口的全息招牌還在閃爍，播放著早已過時的體驗廣告。現實和模擬的界線，在這裡似乎不太可靠。', '裡頭傳出模糊的音效殘響，像是某段體驗還沒真正結束。踏進去之前，最好先做好心理準備。'],
        transition: ['眼角餘光瞄到的東西，說不清是真的還是投影殘留的錯覺。', '這裡的牆壁摸起來是真的，但某些聲音聽起來一點也不像。'],
    },
    '廢棄工廠': {
        intro: ['巨大的傳送帶靜止在半途，堆滿了沒送出去的半成品。這座工廠停工的那天，一定發生過什麼事。', '高聳的煙囪早已不再冒煙，但廠房深處似乎還有動力運轉的聲音。'],
        transition: ['腳邊散落的零件越來越完整，看樣子離核心產線不遠了。', '空氣裡瀰漫著金屬粉塵，每一步都得留意腳下有沒有暗藏的機關。'],
    },
    '荒廢遊樂場': {
        intro: ['摩天輪的骨架在風中發出吱呀聲，斑駁的吉祥物看板還掛在門口，笑容詭異地維持著。', '曾經歡笑聲不斷的地方，如今只剩下生鏽的遊樂設施和說不清從哪傳來的音樂殘響。'],
        transition: ['路過旋轉木馬時，總覺得有什麼在背後多看了一眼。', '遊樂設施的燈光偶爾自己亮起又熄滅，沒人知道是不是還連著電。'],
    },
    '廢棄百貨公司': {
        intro: ['手扶梯早已停止運轉，樓層導覽圖上的商店名稱如今大多對不上號。這裡層層疊疊，值得慢慢摸。', '透過滿是灰塵的櫥窗，還能看到模特兒維持著當年的姿勢——一動也不動地站著。'],
        transition: ['樓層越高，光線越暗，但傳言說頂樓還留著沒被搬空的倉庫。', '某個廣播喇叭斷斷續續播著促銷音樂，聽久了讓人渾身不自在。'],
    },
    '無主小賣店': {
        intro: ['小小的店面，貨架卻比想像中完整——這種地方常常被大隊伍忽略，反而藏著沒被翻過的驚喜。', '收銀台上還放著沒結完的帳，主人多半是走得很匆忙。'],
        transition: ['店裡的貨架排得很密，得側身才能通過，也更容易被什麼東西堵住去路。', '角落堆著的紙箱看起來還沒開封，值得留意，但也可能只是空的。'],
    },
};

// REST 節點的固定敘述文字——單一場景描寫，不像 intro/transition 依主題分組，
// 純粹是「找到一處可以歇息的地方」的過場文案。
export const REST_NARRATIVE = '你找到一處隱蔽的角落，看來應該安全，稍微歇息了一會。你看到牆壁上有個平坦舒適的區塊，靠了上去，覺得舒服不少。起身後，你發現地面上標示著無線充電區域。';

export const pickIntroNarrative = (stageName: string, seed: number): string => {
    const set = NARRATIVE_BY_THEME[stageName] ?? DEFAULT_NARRATIVE;
    return set.intro[seed % set.intro.length]!;
};

export const pickTransitionNarrative = (stageName: string, seed: number): string => {
    const set = NARRATIVE_BY_THEME[stageName] ?? DEFAULT_NARRATIVE;
    return set.transition[seed % set.transition.length]!;
};
