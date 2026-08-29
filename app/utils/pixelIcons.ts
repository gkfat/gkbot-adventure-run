/**
 * Hand-authored 12x12 pixel-art sprites for items/equipment, rendered by
 * <GamePixelIcon>. Each grid is 12 rows of 12 characters; characters map to
 * colors via the grid's own palette. '.' is always transparent.
 */

export type PixelIconName =
    | 'sword' | 'helmet' | 'potion' | 'shield' | 'chest' | 'boot' | 'ring'
    | 'hat' | 'tshirt' | 'hand'
    | 'wrench' | 'riotShield' | 'faceplate' | 'crateVest' | 'greaves' | 'chipRing' | 'engineOil';

type PixelGrid = {
    rows: string[];
    colors: Record<string, string>;
};

const STEEL = '#9aa5ad';
const STEEL_SHADOW = '#63707a';
const STEEL_LIGHT = '#e8eef2';
const GOLD = '#d4af37';
const DARK = '#2b2b2b';
const LEATHER = '#6b4226';
const LEATHER_SHADOW = '#4a2c19';
const GEM_RED = '#e0435c';
const POTION_RED = '#ff6f91';
const GLASS = '#8fa3ad';
const WHITE = '#ffffff';
const HAT_BROWN = '#8a6d4f';
const SHIRT_BLUE = '#4a90a4';
const SKIN = '#e8b48a';
const RUST = '#8a4a2a';
const SCRAP_GREY = '#5a6a72';
const SCRAP_SHADOW = '#3f4b52';
const SCRAP_LIGHT = '#cfe3e8';
const WARNING_RED = '#c0392b';
const PLATE_GREY = '#9aa5ab';
const VISOR_HOUSING = '#0d1a1a';
const VISOR_GLOW = '#22e0e0';
const CRATE_WOOD = '#b58a4a';
const CRATE_SEAM = '#7a5a34';
const CRATE_STRAP = '#3a2a15';
const SERVO_METAL = '#7c8b99';
const SERVO_METAL_SHADOW = '#4a5560';
const SERVO_JOINT = '#3a6ea5';
const CHIP_HOUSING = '#1f2a1f';
const CHIP_GLOW = '#39d353';
const CHIP_BAND = '#b7b7b7';
const OIL_CAP = '#5a5a5a';
const OIL_GLASS = '#8a5a1f';
const OIL_LIQUID = '#3a2408';
const OIL_HIGHLIGHT = '#c99a4a';

export const PIXEL_ICON_GRIDS: Record<PixelIconName, PixelGrid> = {
    sword: {
        rows: [
            '.....BB.....',
            '....BAAB....',
            '....BAAB....',
            '....BAAB....',
            '....BAAB....',
            '....BAAB....',
            '....CAAC....',
            '..GGGGGGGG..',
            '.....HH.....',
            '.....HH.....',
            '....KGGK....',
            '.....KK.....',
        ],
        colors: {
            B: STEEL_SHADOW, A: STEEL_LIGHT, C: STEEL_SHADOW, G: GOLD, H: LEATHER, K: DARK,
        },
    },
    helmet: {
        rows: [
            '....BBBB....',
            '...BBBBBB...',
            '..BBBBBBBB..',
            '.BBBBBBBBBB.',
            'GGGGGGGGGGGG',
            '.KKKKKKKKKK.',
            '.BBBBBBBBBB.',
            '.BBB.KK.BBB.',
            '.BBBBBBBBBB.',
            '..BBBBBBBB..',
            '...HHHHHH...',
            '....KKKK....',
        ],
        colors: {
            B: STEEL, G: GOLD, K: DARK, H: LEATHER,
        },
    },
    potion: {
        rows: [
            '....OOOO....',
            '....OKKO....',
            '....GGGG....',
            '...GG..GG...',
            '..G......G..',
            '.GLLLLLLLLG.',
            '.GLLLWLLLLG.',
            '.GLLLLLLLLG.',
            '.GLLLLLLLLG.',
            '..GLLLLLLG..',
            '...GGGGGG...',
            '....KKKK....',
        ],
        colors: {
            O: LEATHER, K: DARK, G: GLASS, L: POTION_RED, W: WHITE,
        },
    },
    shield: {
        rows: [
            '...BBBBBB...',
            '..BBBBBBBB..',
            '.BBBGGGGBBB.',
            'BBBBBGGBBBBB',
            'BBBBBGGBBBBB',
            'BBBBBGGBBBBB',
            '.BBBBGGBBBB.',
            '..BBBGGBBB..',
            '...BBGGBB...',
            '....BGGB....',
            '.....KK.....',
            '............',
        ],
        colors: {
            B: STEEL, G: GOLD, K: DARK,
        },
    },
    chest: {
        rows: [
            'BB..KKKK..BB',
            'BBB.KKKK.BBB',
            'BBBB.GG.BBBB',
            'BBBBBGGBBBBB',
            'BBBBBGGBBBBB',
            'BBBBBGGBBBBB',
            'BBBBBBBBBBBB',
            'CBBBBBBBBBBC',
            '.CBBBBBBBBC.',
            '..CCCCCCCC..',
            '...KKKKKK...',
            '............',
        ],
        colors: {
            B: STEEL, C: STEEL_SHADOW, G: GOLD, K: DARK,
        },
    },
    boot: {
        rows: [
            '....HHHH....',
            '....HHHH....',
            '....HHHH....',
            '....HGHH....',
            '....HHHH....',
            '....HHHHHH..',
            '....HHHHHHH.',
            '....DDDDDDD.',
            '...KKKKKKKK.',
            '...KKKKKKKK.',
            '............',
            '............',
        ],
        colors: {
            H: LEATHER, D: LEATHER_SHADOW, K: DARK, G: GOLD,
        },
    },
    ring: {
        rows: [
            '.....RR.....',
            '....RRRR....',
            '....RWWR....',
            '.....GG.....',
            '...GGGGGG...',
            '..GG....GG..',
            '.GG......GG.',
            '.GG......GG.',
            '..GG....GG..',
            '...GGGGGG...',
            '....KKKK....',
            '............',
        ],
        colors: {
            R: GEM_RED, W: WHITE, G: GOLD, K: DARK,
        },
    },
    // Simple placeholder icons for the always-visible "equipped slot" overview
    // (distinct from the detailed item art above, which represents an actual item).
    hat: {
        rows: [
            '....BBBB....',
            '....BBBB....',
            '....BBBB....',
            '...BBBBBB...',
            '...KKKKKK...',
            '.BBBBBBBBBB.',
            '............',
            '............',
            '............',
            '............',
            '............',
            '............',
        ],
        colors: {
            B: HAT_BROWN, K: DARK,
        },
    },
    tshirt: {
        rows: [
            '.HH......HH.',
            'HHHHH..HHHHH',
            '.HHHHHHHHHH.',
            '.HHHHHHHHHH.',
            '.HHHHHHHHHH.',
            '.HHHHHHHHHH.',
            '.HHHHHHHHHH.',
            '.HHHHHHHHHH.',
            '..HHHHHHHH..',
            '............',
            '............',
            '............',
        ],
        colors: { H: SHIRT_BLUE },
    },
    hand: {
        rows: [
            '..S.S.S.....',
            '..SSSSSS....',
            '.SSSSSSSS...',
            '.SSSSSSSS...',
            'SS.SSSSSSS..',
            'SS.SSSSSSS..',
            '.SSSSSSSSS..',
            '..SSSSSSSS..',
            '...SSSSSS...',
            '............',
            '............',
            '............',
        ],
        colors: { S: SKIN },
    },
    // Per-template art below — one per known ITEM_TEMPLATES entry, replacing
    // the generic slot fallback in TEMPLATE_ICON (equipmentDisplay.ts).
    wrench: {
        rows: [
            '..BBB.BBB...',
            '..BSB.BSB...',
            '..BBBBBBBB..',
            '...BBBBBB...',
            '....BBBB....',
            '....BSSB....',
            '....BBBB....',
            '....BRBB....',
            '....BSSB....',
            '....BBBB....',
            '...BBBBBB...',
            '...BSSSSB...',
        ],
        colors: {
            B: SCRAP_GREY, S: SCRAP_SHADOW, R: RUST,
        },
    },
    riotShield: {
        rows: [
            '..BBBBBBBB..',
            '.HBBBBBBSBB.',
            '.BBBBBBBSBB.',
            '.BBBBBBBSBB.',
            '.BBBBBBBSBB.',
            '.RRRRRRRRRR.',
            '.RRRRRRRRRR.',
            '.BBBBBBBSBB.',
            '.BBBBBBBSBB.',
            '.BBBBBBBSBB.',
            '.BBBBBBBSBB.',
            '..BBBBBBBB..',
        ],
        colors: {
            B: SCRAP_GREY, S: SCRAP_SHADOW, H: SCRAP_LIGHT, R: WARNING_RED,
        },
    },
    faceplate: {
        rows: [
            '..BBBBBBBB..',
            '.BBBBBBBBBB.',
            '.BBBBBBBBBB.',
            '.BBBBBBBBBB.',
            '.BBKKKKKKBB.',
            '.BBKCCCCKBB.',
            '.BBKKKKKKBB.',
            '.BBBBBBBBBB.',
            '.BBBBBBBBBB.',
            '.BBBBBBBBBB.',
            '.BBBBBBBBBB.',
            '..BBBBBBBB..',
        ],
        colors: {
            B: PLATE_GREY, K: VISOR_HOUSING, C: VISOR_GLOW,
        },
    },
    crateVest: {
        rows: [
            'WW..KKKK..WW',
            'WWW.KKKK.WWW',
            'WWWW.GG.WWWW',
            'WWWWWGGWWWWW',
            'WWWWWGGWWWWW',
            'WWWWWGGWWWWW',
            'WWWWWWWWWWWW',
            'DWWWWWWWWWWD',
            '.DWWWWWWWWD.',
            '..DDDDDDDD..',
            '...KKKKKK...',
            '............',
        ],
        colors: {
            W: CRATE_WOOD, D: CRATE_SEAM, G: CRATE_SEAM, K: CRATE_STRAP,
        },
    },
    greaves: {
        rows: [
            '....MMMM....',
            '....MMMM....',
            '....MJJM....',
            '....MJJM....',
            '....MMMM....',
            '....MMMMMM..',
            '....MMMMMMM.',
            '....DDDDDDD.',
            '...KKKKKKKK.',
            '...KKKKKKKK.',
            '............',
            '............',
        ],
        colors: {
            M: SERVO_METAL, D: SERVO_METAL_SHADOW, K: DARK, J: SERVO_JOINT,
        },
    },
    chipRing: {
        rows: [
            '.....NN.....',
            '....NNNN....',
            '....NEEN....',
            '.....MM.....',
            '...MMMMMM...',
            '..MM....MM..',
            '.MM......MM.',
            '.MM......MM.',
            '..MM....MM..',
            '...MMMMMM...',
            '....KKKK....',
            '............',
        ],
        colors: {
            N: CHIP_HOUSING, E: CHIP_GLOW, M: CHIP_BAND, K: DARK,
        },
    },
    engineOil: {
        rows: [
            '....OOOO....',
            '....OKKO....',
            '....GGGG....',
            '...GG..GG...',
            '..G......G..',
            '.GLLLLLLLLG.',
            '.GLLLHLLLLG.',
            '.GLLLLLLLLG.',
            '.GLLLLLLLLG.',
            '..GLLLLLLG..',
            '...GGGGGG...',
            '....KKKK....',
        ],
        colors: {
            O: OIL_CAP, K: DARK, G: OIL_GLASS, L: OIL_LIQUID, H: OIL_HIGHLIGHT,
        },
    },
};
