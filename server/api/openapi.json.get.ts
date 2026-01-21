/**
 * GET /api/openapi.json
 * 
 * Returns the OpenAPI 3.0 specification for the API
 */

import { defineEventHandler } from 'h3';
import { generateOpenAPISpec } from '../utils/openapi';

export default defineEventHandler(() => {
    return generateOpenAPISpec();
});
