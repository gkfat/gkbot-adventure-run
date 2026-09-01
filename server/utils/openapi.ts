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
    getInventoryResponseSchema,
    deleteItemResponseSchema,
    equipItemRequestSchema,
    equipItemResponseSchema,
    unequipItemRequestSchema,
    unequipItemResponseSchema,
} from '../../shared/schemas/api/inventory.schema';

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
        GetRosterResponse: getRosterResponseSchema,
        CreateCharacterRequest: createCharacterRequestSchema,
        GetCharacterResponse: getCharacterResponseSchema,
        AllocateAttributesRequest: allocateAttributesRequestSchema,
        AllocateAttributesResponse: allocateAttributesResponseSchema,
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
        EquipItemRequest: equipItemRequestSchema,
        EquipItemResponse: equipItemResponseSchema,
        UnequipItemRequest: unequipItemRequestSchema,
        UnequipItemResponse: unequipItemResponseSchema,
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
        path: '/api/character/{characterId}/nickname',
        description: 'Set or update character nickname',
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
                description: 'Invalid nickname',
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
        method: 'delete',
        path: '/api/character/{characterId}',
        description: 'Permanently delete a character (must belong to the caller). Equipped/inventory item documents are left intact — only the character\'s equipment map, its inventory reference list, and all of its adventure runs are removed.',
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
        ],
    });
}
