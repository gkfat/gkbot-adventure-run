/**
 * Hand-authored 12x12 pixel-art sprites for items/equipment, rendered by
 * <GamePixelIcon>. Each grid is 12 rows of 12 characters; characters map to
 * colors via the grid's own palette. '.' is always transparent.
 */

export type PixelIconName =
    | 'sword' | 'helmet' | 'potion' | 'shield' | 'chest' | 'boot' | 'ring'
    | 'hat' | 'tshirt' | 'hand';

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
};
