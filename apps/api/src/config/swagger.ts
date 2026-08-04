import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Paydex API',
      version: '1.0.0',
      description: 'Payment Event Gateway & Audit Platform. Never lose a payment event again.',
      contact: {
        name: 'Christovel Clever Slat',
        url: 'https://github.com/ChrisSlat0910',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token or API key (pd_live_xxx / pd_test_xxx)',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { nullable: true },
            error: {
              nullable: true,
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
            meta: { nullable: true },
          },
        },
        TokenPair: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            prefix: { type: 'string' },
            environment: { type: 'string', enum: ['live', 'test'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Gateway: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            adapterType: { type: 'string', enum: ['midtrans', 'stripe', 'xendit'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        WebhookEvent: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            externalId: { type: 'string' },
            eventType: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'DELIVERED', 'FAILED', 'DUPLICATE'] },
            gatewayId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DeliveryLog: {
          type: 'object',
          properties: {
            attemptNumber: { type: 'integer' },
            httpStatus: { type: 'integer', nullable: true },
            responseBody: { type: 'string', nullable: true },
            durationMs: { type: 'integer', nullable: true },
            status: { type: 'string', enum: ['SUCCESS', 'FAILED'] },
            errorMessage: { type: 'string', nullable: true },
            attemptedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.router.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
