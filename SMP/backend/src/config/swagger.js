const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Service Marketplace Platform API',
            version: '1.0.0',
            description: 'API documentation for the Service Marketplace Platform',
            contact: {
                name: 'API Support',
                email: 'support@example.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:5000/api',
                description: 'Development server'
            },
            {
                url: 'http://localhost:3000',
                description: 'Frontend Development server'
            },
            {
                url: 'https://api.smp.com',
                description: 'Production API server'
            },
            {
                url: 'https://smp.com',
                description: 'Production Frontend server'
            }
        ],
        components: {
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        email: { type: 'string' },
                        phoneNumber: { type: 'string' },
                        userType: { type: 'string', enum: ['Seeker', 'Provider'] },
                        profilePicture: { type: 'string' },
                        bio: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Job: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        categoryId: { type: 'string' },
                        seekerId: { type: 'string' },
                        providerId: { type: 'string' },
                        budget: { type: 'number' },
                        status: { type: 'string', enum: ['Open', 'In Progress', 'Completed', 'Cancelled'] },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                Bid: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        jobId: { type: 'string' },
                        providerId: { type: 'string' },
                        amount: { type: 'number' },
                        description: { type: 'string' },
                        status: { type: 'string', enum: ['Pending', 'Accepted', 'Rejected'] },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                }
            },
            securitySchemes: {
                ClerkAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{
            ClerkAuth: []
        }]
    },
    apis: [
        './routes/*.js',
        './src/routes/*.js',
        './models/*.js',
        './src/models/*.js'
    ]
};

const specs = swaggerJsdoc(options);

module.exports = specs; 