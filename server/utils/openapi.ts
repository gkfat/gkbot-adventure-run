/**
 * OpenAPI specification generator
 * 
 * This utility generates OpenAPI 3.0 specification from Zod schemas
 * using @asteasolutions/zod-to-openapi
 */

import {
    OpenAPIRegistry,
    OpenApiGeneratorV3,
    extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// Import all API schemas
import {
    loginRequestSchema,
    loginResponseSchema,
    meResponseSchema,
    deleteAccountResponseSchema,
} from '../../shared/schemas/api/auth.schema';

import {
    getRosterResponseSchema,
    createCharacterRequestSchema,
    getCharacterResponseSchema,
    allocateAttributesRequestSchema,
    allocateAttributesResponseSchema,
    allocateTalentRequestSchema,
    allocateTalentResponseSchema,
    setNicknameRequestSchema,
    setNicknameResponseSchema,
    deleteCharacterResponseSchema,
} from '../../shared/schemas/api/character.schema';

import {
    startAdventureRequestSchema,
    startAdventureResponseSchema,
    getCurrentAdventureQuerySchema,
    getCurrentAdventureResponseSchema,
    advanceAdventureRequestSchema,
    advanceAdventureResponseSchema,
    abandonAdventureRequestSchema,
    abandonAdventureResponseSchema,
    startCombatRequestSchema,
    startCombatResponseSchema,
    resolveEventRequestSchema,
    resolveEventResponseSchema,
    selectBlessingRequestSchema,
    selectBlessingResponseSchema,
    restHealRequestSchema,
    restHealResponseSchema,
} from '../../shared/schemas/api/adventure.schema';

import {
    getLeaderboardRequestSchema,
    getLeaderboardResponseSchema,
} from '../../shared/schemas/api/leaderboard.schema';

import {
    getMailboxResponseSchema,
    claimMailResponseSchema,
} from '../../shared/schemas/api/mailbox.schema';

import {
    getInventoryResponseSchema,
    deleteItemResponseSchema,
    sellItemResponseSchema,
    equipItemRequestSchema,
    equipItemResponseSchema,
    unequipItemRequestSchema,
    unequipItemResponseSchema,
} from '../../shared/schemas/api/inventory.schema';

import {
    getShopResponseSchema,
    purchaseItemRequestSchema,
    purchaseItemResponseSchema,
    getDailySupplyResponseSchema,
    claimDailySupplyResponseSchema,
} from '../../shared/schemas/api/shop.schema';

import {
    gachaPullRequestSchema,
    gachaPullResponseSchema,
} from '../../shared/schemas/api/gacha.schema';

import { getBestiaryResponseSchema } from '../../shared/schemas/api/bestiary.schema';
import {
    getCharacterSkillsResponseSchema,
    unlockSkillRequestSchema, unlockSkillResponseSchema,
    strengthenSkillRequestSchema, strengthenSkillResponseSchema,
    equipSkillRequestSchema, equipSkillResponseSchema,
} from '../../shared/schemas/api/character-skill.schema';

import {
    updateAccountSettingsRequestSchema,
    updateAccountSettingsResponseSchema,
} from '../../shared/schemas/api/account.schema';

import {
    getDailyQuestsResponseSchema,
    claimDailyQuestResponseSchema,
    getPersistentQuestsResponseSchema,
    claimPersistentQuestResponseSchema,
    getAchievementsResponseSchema,
    claimAchievementResponseSchema,
} from '../../shared/schemas/api/quest.schema';

// Extend Zod with OpenAPI methods
extendZodWithOpenApi(z);

/**
 * Error response schema used across all endpoints
 */
const errorResponseSchema = z.object({
    success: z.literal(false),
    error: z.object({
        message: z.string(),
        statusCode: z.number().optional(),
    }),
});

/**
 * Create and configure OpenAPI registry
 */
export function createOpenAPIRegistry(): OpenAPIRegistry {
    const registry = new OpenAPIRegistry();

    // Register common components
    registry.registerComponent('securitySchemes', 'bearerAuth', {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Firebase ID Token',
        description: 'Firebase Authentication ID Token obtained from Firebase Auth SDK',
    });

    // Register schemas as components using registerComponent
    // This bypasses the need for .openapi() extension on schemas
    const schemas = {
        LoginRequest: loginRequestSchema,
        LoginResponse: loginResponseSchema,
        MeResponse: meResponseSchema,
        DeleteAccountResponse: deleteAccountResponseSchema,
        UpdateAccountSettingsRequest: updateAccountSettingsRequestSchema,
        UpdateAccountSettingsResponse: updateAccountSettingsResponseSchema,
        GetRosterResponse: getRosterResponseSchema,
        CreateCharacterRequest: createCharacterRequestSchema,
        GetCharacterResponse: getCharacterResponseSchema,
        AllocateAttributesRequest: allocateAttributesRequestSchema,
        AllocateAttributesResponse: allocateAttributesResponseSchema,
        AllocateTalentRequest: allocateTalentRequestSchema,
        AllocateTalentResponse: allocateTalentResponseSchema,
        SetNicknameRequest: setNicknameRequestSchema,
        SetNicknameResponse: setNicknameResponseSchema,
        StartAdventureResponse: startAdventureResponseSchema,
        GetCurrentAdventureResponse: getCurrentAdventureResponseSchema,
        AdvanceAdventureResponse: advanceAdventureResponseSchema,
        AbandonAdventureResponse: abandonAdventureResponseSchema,
        StartCombatResponse: startCombatResponseSchema,
        ResolveEventRequest: resolveEventRequestSchema,
        ResolveEventResponse: resolveEventResponseSchema,
        SelectBlessingRequest: selectBlessingRequestSchema,
        SelectBlessingResponse: selectBlessingResponseSchema,
        RestHealResponse: restHealResponseSchema,
        GetInventoryResponse: getInventoryResponseSchema,
        DeleteItemResponse: deleteItemResponseSchema,
        SellItemResponse: sellItemResponseSchema,
        EquipItemRequest: equipItemRequestSchema,
        EquipItemResponse: equipItemResponseSchema,
        UnequipItemRequest: unequipItemRequestSchema,
        UnequipItemResponse: unequipItemResponseSchema,
        GetShopResponse: getShopResponseSchema,
        PurchaseItemRequest: purchaseItemRequestSchema,
        PurchaseItemResponse: purchaseItemResponseSchema,
        GetDailySupplyResponse: getDailySupplyResponseSchema,
        ClaimDailySupplyResponse: claimDailySupplyResponseSchema,
        GachaPullRequest: gachaPullRequestSchema,
        GachaPullResponse: gachaPullResponseSchema,
        GetDailyQuestsResponse: getDailyQuestsResponseSchema,
        ClaimDailyQuestResponse: claimDailyQuestResponseSchema,
        GetPersistentQuestsResponse: getPersistentQuestsResponseSchema,
        ClaimPersistentQuestResponse: claimPersistentQuestResponseSchema,
        GetAchievementsResponse: getAchievementsResponseSchema,
        ClaimAchievementResponse: claimAchievementResponseSchema,
        GetLeaderboardResponse: getLeaderboardResponseSchema,
        GetMailboxResponse: getMailboxResponseSchema,
        ClaimMailResponse: claimMailResponseSchema,
        ErrorResponse: errorResponseSchema,
    };

    // Register each schema manually
    for (const [name, schema] of Object.entries(schemas)) {
        registry.registerComponent('schemas', name, schema as any);
    }

    // Register Authentication Endpoints
    registry.registerPath({
        method: 'post',
        path: '/api/auth/login',
        description: 'Authenticate user with Firebase ID token',
        tags: ['Authentication'],
        request: { body: { content: { 'application/json': { schema: loginRequestSchema } } } },
        responses: {
            200: {
                description: 'Successful authentication',
                content: { 'application/json': { schema: loginResponseSchema } },
            },
            400: {
                description: 'Invalid request or token',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/auth/me',
        description: 'Get current authenticated user information',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'User information retrieved',
                content: { 'application/json': { schema: meResponseSchema } },
            },
            401: {
                description: 'Unauthorized - Invalid or missing token',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'delete',
        path: '/api/auth/account',
        description: 'Delete current user account and all associated data',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Account successfully deleted',
                content: { 'application/json': { schema: deleteAccountResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'put',
        path: '/api/account/settings',
        description: 'Update the caller\'s BGM/SFX audio preference (partial update)',
        tags: ['Account'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: updateAccountSettingsRequestSchema } } } },
        responses: {
            200: {
                description: 'Audio settings updated',
                content: { 'application/json': { schema: updateAccountSettingsResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    // Register Character Endpoints
    registry.registerPath({
        method: 'get',
        path: '/api/character/roster',
        description: 'List the caller\'s characters and the available archetypes to create new ones from',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Roster retrieved',
                content: { 'application/json': { schema: getRosterResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character',
        description: 'Create a new character from an archetype (max 3 characters per account)',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: createCharacterRequestSchema } } } },
        responses: {
            200: {
                description: 'Character created',
                content: { 'application/json': { schema: getCharacterResponseSchema } },
            },
            400: {
                description: 'Roster already full or unknown archetype',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}',
        description: 'Get a character (must belong to the caller) including stats and attributes',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Character information retrieved',
                content: { 'application/json': { schema: getCharacterResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/attributes',
        description: 'Allocate unspent attribute points to character stats',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: allocateAttributesRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Attributes successfully allocated',
                content: { 'application/json': { schema: allocateAttributesResponseSchema } },
            },
            400: {
                description: 'Invalid request or insufficient points',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/talents',
        description: 'Invest 1 talent point into a node on the character\'s archetype talent tree',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: allocateTalentRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Talent point successfully allocated',
                content: { 'application/json': { schema: allocateTalentResponseSchema } },
            },
            400: {
                description: 'Unknown node, insufficient talentPoints, node already maxRank, previous tier not opened, or opposing branch locked',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/nickname',
        description: 'Rename character. First rename is free; every rename after that costs RENAME_COST_GEMS gems',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: setNicknameRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Nickname successfully updated',
                content: { 'application/json': { schema: setNicknameResponseSchema } },
            },
            400: {
                description: 'Invalid nickname, or insufficient gems for a paid rename',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/equip',
        description: 'Equip an item from the character\'s permanent inventory onto itself; replaces whatever occupies the item\'s slot',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: equipItemRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Item equipped (and previous item in that slot, if any, returned as unequipped)',
                content: { 'application/json': { schema: equipItemResponseSchema } },
            },
            400: {
                description: 'Item not in inventory, not equipment, or slot mismatch',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/unequip',
        description: 'Unequip the item currently in the given slot on a character',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: unequipItemRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Item unequipped',
                content: { 'application/json': { schema: unequipItemResponseSchema } },
            },
            400: {
                description: 'Slot is already empty',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    // Register Inventory Endpoints
    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/inventory',
        description: 'List a character\'s permanent inventory contents',
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Inventory retrieved',
                content: { 'application/json': { schema: getInventoryResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'delete',
        path: '/api/character/{characterId}/inventory/{itemId}',
        description: 'Permanently discard an item from a character\'s inventory (cannot be undone; fails if the item is currently equipped)',
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({
                characterId: z.string(), itemId: z.string(), 
            }), 
        },
        responses: {
            200: {
                description: 'Item discarded',
                content: { 'application/json': { schema: deleteItemResponseSchema } },
            },
            400: {
                description: 'Item is currently equipped',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found, or item not found in the character\'s inventory',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/inventory/{itemId}/sell',
        description: 'Sell an item from a character\'s inventory for gold (half of its rarity\'s shop gold price; cannot be undone; fails if the item is currently equipped)',
        tags: ['Inventory'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({
                characterId: z.string(), itemId: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'Item sold',
                content: { 'application/json': { schema: sellItemResponseSchema } },
            },
            400: {
                description: 'Item is currently equipped',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found, or item not found in the character\'s inventory',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    // Register Shop Endpoints
    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/shop',
        description: 'Get the character\'s daily shop (gold items capped at N/R/SR, gems items floored at SR/SSR/L, merged into a single list), lazily generating it if today\'s shop doesn\'t exist yet',
        tags: ['Shop'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Shop retrieved',
                content: { 'application/json': { schema: getShopResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/shop/purchase',
        description: 'Purchase an unsold shop slot: deducts gold/gems, marks the slot sold, and delivers the item that was already rolled at shop-generation time into the character\'s permanent inventory (and equipment slot, if destination is EQUIP)',
        tags: ['Shop'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: purchaseItemRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Item purchased',
                content: { 'application/json': { schema: purchaseItemResponseSchema } },
            },
            400: {
                description: 'Insufficient gold/gems, inventory full, or item is not equipment (EQUIP destination)',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found, shop not generated yet, or shop slot not found',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            409: {
                description: 'Shop slot already sold',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/shop/daily-supply',
        description: 'Get the character\'s daily supply (100 gold + one pre-rolled N-rarity equipment item, claimable once per day), lazily generating it if today\'s daily supply doesn\'t exist yet',
        tags: ['Shop'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Daily supply retrieved',
                content: { 'application/json': { schema: getDailySupplyResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/shop/daily-supply/claim',
        description: 'Claim today\'s daily supply: credits 100 gold and delivers the pre-rolled N-rarity equipment item into the character\'s permanent inventory, then marks it claimed',
        tags: ['Shop'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Daily supply claimed',
                content: { 'application/json': { schema: claimDailySupplyResponseSchema } },
            },
            400: {
                description: 'Inventory is full',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found, or daily supply not generated yet',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            409: {
                description: 'Daily supply already claimed',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    // Register Gacha Endpoint
    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/gacha/pull',
        description: 'Spend a fixed amount of gold (100) or gems (5) to roll one random equipment item using a currency-specific rarity weight table, delivered directly into the character\'s permanent inventory',
        tags: ['Gacha'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: gachaPullRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Pull completed',
                content: { 'application/json': { schema: gachaPullResponseSchema } },
            },
            400: {
                description: 'Insufficient gold/gems, or inventory full',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/bestiary',
        description: 'Get the full enemy archetype bestiary for a character (must belong to the caller), each entry flagged with whether the character has encountered it; name/description/portraitUrl are only included for encountered entries',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Bestiary retrieved',
                content: { 'application/json': { schema: getBestiaryResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/skills',
        description: 'Get the character\'s skill catalog (its archetype\'s CHARACTER_SKILLS), each entry flagged unlocked/not; description/effect/level/exp/isEquipped are only included once a skill is unlocked',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Skills retrieved',
                content: { 'application/json': { schema: getCharacterSkillsResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/skills/unlock',
        description: 'Unlock a skill by spending its unlockFragmentCost skill fragments',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: unlockSkillRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Skill unlocked',
                content: { 'application/json': { schema: unlockSkillResponseSchema } },
            },
            400: {
                description: 'Unknown skill for this archetype, already unlocked, or not enough fragments',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/skills/strengthen',
        description: 'Consume fragmentsToSpend fragments of an already-unlocked skill, converting them to exp and applying the level-up check',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: strengthenSkillRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Skill strengthened',
                content: { 'application/json': { schema: strengthenSkillResponseSchema } },
            },
            400: {
                description: 'Unknown skill for this archetype, not yet unlocked, or not enough fragments',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/skills/equip',
        description: 'Place (skillId) or clear (null) an unlocked skill into slotIndex of the character\'s equip loadout',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({ characterId: z.string() }),
            body: { content: { 'application/json': { schema: equipSkillRequestSchema } } },
        },
        responses: {
            200: {
                description: 'Skill equip loadout updated',
                content: { 'application/json': { schema: equipSkillResponseSchema } },
            },
            400: {
                description: 'Slot not unlocked yet, skill not unlocked, or skill already equipped in another slot',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'delete',
        path: '/api/character/{characterId}',
        description: 'Permanently delete a character (must belong to the caller). Equipped/inventory item documents are left intact — only the character\'s equipment map, its inventory reference list, all of its adventure runs, and its per-character shop documents are removed.',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Character deleted',
                content: { 'application/json': { schema: deleteCharacterResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    // Register Adventure Endpoints
    registry.registerPath({
        method: 'post',
        path: '/api/adventure/start',
        description: 'Start a new adventure run',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: startAdventureRequestSchema } } } },
        responses: {
            200: {
                description: 'Adventure successfully started',
                content: { 'application/json': { schema: startAdventureResponseSchema } },
            },
            400: {
                description: 'Already in an active adventure',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/adventure/current',
        description: 'Get current active adventure run',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        request: { query: getCurrentAdventureQuerySchema },
        responses: {
            200: {
                description: 'Current adventure state (null if no active adventure)',
                content: { 'application/json': { schema: getCurrentAdventureResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/adventure/abandon',
        description: 'Force-settle the active adventure run as DISCONNECT (forfeit), regardless of reconnect window',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: abandonAdventureRequestSchema } } } },
        responses: {
            200: {
                description: 'Run abandoned and settled',
                content: { 'application/json': { schema: abandonAdventureResponseSchema } },
            },
            400: {
                description: 'No active adventure run',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/adventure/advance',
        description: 'Advance to next node in adventure',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: advanceAdventureRequestSchema } } } },
        responses: {
            200: {
                description: 'Advanced to next node',
                content: { 'application/json': { schema: advanceAdventureResponseSchema } },
            },
            400: {
                description: 'Cannot advance (no active adventure or invalid state)',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/adventure/combat/start',
        description: 'Start combat at current node',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: startCombatRequestSchema } } } },
        responses: {
            200: {
                description: 'Combat completed with log and summary',
                content: { 'application/json': { schema: startCombatResponseSchema } },
            },
            400: {
                description: 'Not at combat node or invalid state',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/adventure/event/resolve',
        description: 'Resolve event at current node',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: resolveEventRequestSchema } } } },
        responses: {
            200: {
                description: 'Event resolved',
                content: { 'application/json': { schema: resolveEventResponseSchema } },
            },
            400: {
                description: 'Not at event node or invalid choice',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/adventure/blessing/select',
        description: 'Select a blessing modifier',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: selectBlessingRequestSchema } } } },
        responses: {
            200: {
                description: 'Blessing selected',
                content: { 'application/json': { schema: selectBlessingResponseSchema } },
            },
            400: {
                description: 'Not at blessing node or invalid blessing ID',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/adventure/rest/heal',
        description: 'Heal at rest node',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: restHealRequestSchema } } } },
        responses: {
            200: {
                description: 'Healing completed',
                content: { 'application/json': { schema: restHealResponseSchema } },
            },
            400: {
                description: 'Not at rest node',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    // Register Quest Endpoints
    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/quests/daily',
        description: 'Get (lazily generating if needed) today\'s 3 daily quests and progress for a character',
        tags: ['Quests'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Daily quests retrieved',
                content: { 'application/json': { schema: getDailyQuestsResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/quests/daily/claim/{questId}',
        description: 'Claim a completed daily quest\'s reward (gold 10~50, gems 0~1)',
        tags: ['Quests'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({
                characterId: z.string(), questId: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'Quest claimed',
                content: { 'application/json': { schema: claimDailyQuestResponseSchema } },
            },
            400: {
                description: 'Quest not completed yet',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character or quest not found',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            409: {
                description: 'Quest already claimed',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/quests/persistent',
        description: 'Get (lazily creating if needed) a character\'s persistent quests and progress — never reset, claimable once per character',
        tags: ['Quests'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Persistent quests retrieved',
                content: { 'application/json': { schema: getPersistentQuestsResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/quests/persistent/claim/{questId}',
        description: 'Claim a completed persistent quest\'s reward (gold/gems, once per character)',
        tags: ['Quests'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({
                characterId: z.string(), questId: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'Quest claimed',
                content: { 'application/json': { schema: claimPersistentQuestResponseSchema } },
            },
            400: {
                description: 'Quest not completed yet',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character or quest not found',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            409: {
                description: 'Quest already claimed',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    // Register Achievement Endpoints
    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/achievements',
        description: 'Get a character\'s achievement list with progress and claim status (lazily creating missing entries)',
        tags: ['Achievements'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Achievements retrieved',
                content: { 'application/json': { schema: getAchievementsResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found or not owned by the caller',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/achievements/claim/{achievementId}',
        description: 'Claim a completed achievement\'s reward (gems 3~5, once per character, lifetime)',
        tags: ['Achievements'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({
                characterId: z.string(), achievementId: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'Achievement claimed',
                content: { 'application/json': { schema: claimAchievementResponseSchema } },
            },
            400: {
                description: 'Achievement not completed yet',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character or achievement not found',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            409: {
                description: 'Achievement already claimed',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/character/{characterId}/mailbox',
        description: 'List the character\'s mail, newest first',
        tags: ['Mailbox'],
        security: [{ bearerAuth: [] }],
        request: { params: z.object({ characterId: z.string() }) },
        responses: {
            200: {
                description: 'Mailbox contents',
                content: { 'application/json': { schema: getMailboxResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character not found',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/{characterId}/mailbox/{mailId}/claim',
        description: 'Claim a mail\'s reward (gold/gems/items), marking it claimed',
        tags: ['Mailbox'],
        security: [{ bearerAuth: [] }],
        request: {
            params: z.object({
                characterId: z.string(), mailId: z.string(),
            }),
        },
        responses: {
            200: {
                description: 'Mail claimed',
                content: { 'application/json': { schema: claimMailResponseSchema } },
            },
            400: {
                description: 'Inventory is full',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            404: {
                description: 'Character or mail not found',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            409: {
                description: 'Mail already claimed',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/leaderboard',
        description: 'Get this season\'s Top-N leaderboard, its end time (seasonEndsAt), and — if characterId is given — that character\'s own rank/entry',
        tags: ['Leaderboard'],
        security: [{ bearerAuth: [] }],
        request: { query: getLeaderboardRequestSchema },
        responses: {
            200: {
                description: 'Leaderboard entries, seasonEndsAt, and (if characterId was given and has a record) its own rank',
                content: { 'application/json': { schema: getLeaderboardResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'get',
        path: '/api/cron/leaderboard-season-settle',
        description: 'Vercel Cron target — settles the leaderboard season that just ended and mails tiered rewards to every ranked character. Not for client use: requires an `Authorization: Bearer <CRON_SECRET>` header instead of Firebase auth',
        tags: ['Leaderboard'],
        responses: {
            200: { description: 'Settlement ran (possibly with zero entries)' },
            401: {
                description: 'Missing or invalid CRON_SECRET',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    return registry;
}

/**
 * Generate OpenAPI 3.0 specification
 */
export function generateOpenAPISpec() {
    const registry = createOpenAPIRegistry();

    const generator = new OpenApiGeneratorV3(registry.definitions);

    return generator.generateDocument({
        openapi: '3.0.0',
        info: {
            version: '1.0.0',
            title: 'GKBot Adventure Run API',
            description: 'RESTful API for the Adventure Run game system. All endpoints (except /api/auth/login) require Firebase Authentication.',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local development server',
            }, {
                url: 'https://your-production-domain.vercel.app',
                description: 'Production server',
            },
        ],
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and account management',
            },
            {
                name: 'Character',
                description: 'Character management, stats, and progression',
            },
            {
                name: 'Adventure',
                description: 'Adventure run gameplay and progression',
            },
            {
                name: 'Inventory',
                description: 'Permanent inventory management',
            },
            {
                name: 'Quests',
                description: 'Daily and persistent quest progress and claiming',
            },
            {
                name: 'Achievements',
                description: 'Lifetime-once-per-character achievement progress and claiming',
            },
            {
                name: 'Leaderboard',
                description: 'Server-wide best-score leaderboard',
            },
            {
                name: 'Mailbox',
                description: 'Character-scoped mail and reward claiming',
            },
        ],
    });
}
