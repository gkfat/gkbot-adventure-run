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
    getCharacterResponseSchema,
    allocateAttributesRequestSchema,
    allocateAttributesResponseSchema,
    setNicknameRequestSchema,
    setNicknameResponseSchema,
    upgradePotionResponseSchema,
} from '../../shared/schemas/api/character.schema';

import {
    startAdventureResponseSchema,
    getCurrentAdventureResponseSchema,
    advanceAdventureResponseSchema,
    startCombatResponseSchema,
    resolveEventRequestSchema,
    resolveEventResponseSchema,
    selectBlessingRequestSchema,
    selectBlessingResponseSchema,
    restHealResponseSchema,
    endAdventureResponseSchema,
} from '../../shared/schemas/api/adventure.schema';

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
        GetCharacterResponse: getCharacterResponseSchema,
        AllocateAttributesRequest: allocateAttributesRequestSchema,
        AllocateAttributesResponse: allocateAttributesResponseSchema,
        SetNicknameRequest: setNicknameRequestSchema,
        SetNicknameResponse: setNicknameResponseSchema,
        UpgradePotionResponse: upgradePotionResponseSchema,
        StartAdventureResponse: startAdventureResponseSchema,
        GetCurrentAdventureResponse: getCurrentAdventureResponseSchema,
        AdvanceAdventureResponse: advanceAdventureResponseSchema,
        StartCombatResponse: startCombatResponseSchema,
        ResolveEventRequest: resolveEventRequestSchema,
        ResolveEventResponse: resolveEventResponseSchema,
        SelectBlessingRequest: selectBlessingRequestSchema,
        SelectBlessingResponse: selectBlessingResponseSchema,
        RestHealResponse: restHealResponseSchema,
        EndAdventureResponse: endAdventureResponseSchema,
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
        path: '/api/character',
        description: 'Get current character information including stats and attributes',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Character information retrieved',
                content: { 'application/json': { schema: getCharacterResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/attributes',
        description: 'Allocate unspent attribute points to character stats',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: allocateAttributesRequestSchema } } } },
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
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/nickname',
        description: 'Set or update character nickname',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        request: { body: { content: { 'application/json': { schema: setNicknameRequestSchema } } } },
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
        },
    });

    registry.registerPath({
        method: 'post',
        path: '/api/character/potion/upgrade',
        description: 'Upgrade healing potion level using gold',
        tags: ['Character'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Potion successfully upgraded',
                content: { 'application/json': { schema: upgradePotionResponseSchema } },
            },
            400: {
                description: 'Insufficient gold or max level reached',
                content: { 'application/json': { schema: errorResponseSchema } },
            },
            401: {
                description: 'Unauthorized',
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
        path: '/api/adventure/advance',
        description: 'Advance to next node in adventure',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
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

    registry.registerPath({
        method: 'post',
        path: '/api/adventure/end',
        description: 'End current adventure and collect rewards',
        tags: ['Adventure'],
        security: [{ bearerAuth: [] }],
        responses: {
            200: {
                description: 'Adventure ended with rewards',
                content: { 'application/json': { schema: endAdventureResponseSchema } },
            },
            400: {
                description: 'No active adventure',
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
        ],
    });
}
