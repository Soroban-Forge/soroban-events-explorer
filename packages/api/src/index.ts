import Fastify from 'fastify';
import { prisma } from '@soroban-forge/db';
import fastifyWebsocket from '@fastify/websocket';
import { Client } from 'pg';
import { EventEmitter } from 'events';

const fastify = Fastify({ logger: true });

// Register WebSocket support
fastify.register(fastifyWebsocket);

// Setup EventEmitter for Pub/Sub
const eventEmitter = new EventEmitter();

// Handle CORS for frontend clients
fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (request.method === 'OPTIONS') {
        return reply.status(204).send();
    }
});

// V1 Scaffold: Dynamic Events Feed from DB
fastify.get('/events', async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string; contractId?: string };
    
    // Parse pagination parameters
    let limit = parseInt(query.limit || '10', 10);
    let offset = parseInt(query.offset || '0', 10);
    
    if (isNaN(limit) || limit < 1) {
        limit = 10;
    }
    if (isNaN(offset) || offset < 0) {
        offset = 0;
    }
    
    // Safety cap on page size
    if (limit > 100) {
        limit = 100;
    }

    const where: any = {};
    if (query.contractId) {
        where.contractId = query.contractId;
    }

    try {
        const events = await prisma.event.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: {
                timestamp: 'desc',
            },
        });

        const total = await prisma.event.count({ where });

        return {
            status: "success",
            network: process.env.STELLAR_NETWORK || 'testnet',
            pagination: {
                limit,
                offset,
                total,
            },
            events,
        };
    } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
            status: "error",
            message: "Failed to retrieve events from database",
        });
    }
});

// Real-time Event Stream via WebSocket
fastify.get('/events/stream', { websocket: true }, (connection, req) => {
    // Send an initial connected message
    connection.socket.send(JSON.stringify({ type: 'connected', message: 'Listening for new Soroban events...' }));

    const handleNewEvent = async (eventId: string) => {
        try {
            const event = await prisma.event.findUnique({
                where: { id: eventId }
            });
            if (event) {
                if (connection.socket.readyState === 1) { // OPEN
                    connection.socket.send(JSON.stringify({
                        type: 'new_event',
                        data: event
                    }));
                }
            }
        } catch (error) {
            fastify.log.error(`Failed to fetch and broadcast event ${eventId}: ${error}`);
        }
    };

    eventEmitter.on('new_event', handleNewEvent);

    connection.socket.on('close', () => {
        eventEmitter.off('new_event', handleNewEvent);
    });

    connection.socket.on('error', () => {
        eventEmitter.off('new_event', handleNewEvent);
    });
});

const setupPgListener = async () => {
    const pgClient = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await pgClient.connect();
        await pgClient.query('LISTEN new_event');
        fastify.log.info('Connected to PostgreSQL and listening for new_event notifications');

        pgClient.on('notification', (msg) => {
            if (msg.channel === 'new_event' && msg.payload) {
                eventEmitter.emit('new_event', msg.payload);
            }
        });

        pgClient.on('error', (err) => {
            fastify.log.error(err, 'PostgreSQL client error:');
        });

    } catch (error) {
        fastify.log.error(error, 'Failed to setup PostgreSQL listener:');
    }
};

const start = async () => {
    try {
        await setupPgListener();
        
        // MUST bind to 0.0.0.0 for Docker networking to expose the port
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        console.log('Soroban Events API listening on http://0.0.0.0:3001');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();