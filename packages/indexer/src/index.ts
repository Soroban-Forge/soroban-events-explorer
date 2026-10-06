import { rpc } from '@stellar/stellar-sdk';
import { prisma } from '@soroban-forge/db';

const STELLAR_NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const RPC_URL = process.env.RPC_URL || 'https://soroban-testnet.stellar.org';
const POLLING_INTERVAL_MS = 5000;
const EVENT_PAGE_LIMIT = 100;

console.log(`[Indexer] Starting Soroban Event Indexer on ${STELLAR_NETWORK}...`);
console.log(`[Indexer] Connecting to Stellar RPC at ${RPC_URL}`);

let lastScannedLedger: number | undefined;
let isPolling = false;

function eventToLogPayload(event: rpc.Api.EventResponse) {
    return {
        id: event.id,
        type: event.type,
        ledger: event.ledger,
        ledgerClosedAt: event.ledgerClosedAt,
        contractId: event.contractId?.toString(),
        txHash: event.txHash,
        topic: event.topic.map((topicPart) => topicPart.toXDR('base64')),
        value: event.value.toXDR('base64'),
    };
}

async function pollLedger() {
    if (isPolling) {
        console.log('[Indexer] Previous poll is still in progress. Skipping execution...');
        return;
    }
    isPolling = true;

    try {
        const server = new rpc.Server(RPC_URL);
        if (lastScannedLedger === undefined) {
            const indexerState = await prisma.indexerState.findUnique({
                where: { id: 'main_indexer' },
            });
            if (indexerState) {
                lastScannedLedger = indexerState.lastScannedLedger;
                console.log(`[Indexer] Resumed from database lastScannedLedger: ${lastScannedLedger}`);
            }
        }

        const latestLedger = await server.getLatestLedger();
        const startLedger = lastScannedLedger === undefined
            ? latestLedger.sequence
            : lastScannedLedger + 1;

        if (startLedger > latestLedger.sequence) {
            console.log(`[Indexer] Ledger ${latestLedger.sequence} already scanned. Waiting for the next close.`);
            return;
        }

        const events = await server.getEvents({
            startLedger,
            endLedger: latestLedger.sequence + 1,
            filters: [{ type: 'contract' }],
            limit: EVENT_PAGE_LIMIT,
        });

        for (const event of events.events) {
            const payload = eventToLogPayload(event);
            console.log('[Indexer] Soroban event', payload);

            // Persist the event to PostgreSQL via Prisma
            const created = await prisma.event.upsert({
                where: { id: payload.id },
                update: {},
                create: {
                    id: payload.id,
                    contractId: payload.contractId || '',
                    topic: payload.topic.join(','),
                    data: payload.value,
                    timestamp: payload.ledgerClosedAt ? new Date(payload.ledgerClosedAt) : new Date(),
                },
            });
            
            // Broadcast via PostgreSQL NOTIFY
            await prisma.$executeRaw`SELECT pg_notify('new_event', ${created.id})`;
        }

        lastScannedLedger = latestLedger.sequence;
        await prisma.indexerState.upsert({
            where: { id: 'main_indexer' },
            update: { lastScannedLedger: latestLedger.sequence },
            create: { id: 'main_indexer', lastScannedLedger: latestLedger.sequence },
        });

        console.log(`[Indexer] Scanned ledgers ${startLedger}-${latestLedger.sequence}. Found ${events.events.length} Soroban events.`);
    } catch (error) {
        console.error('[Indexer] Failed to poll Stellar RPC', error);
    } finally {
        isPolling = false;
    }
}

// Start the polling loop
setInterval(pollLedger, POLLING_INTERVAL_MS);
void pollLedger();

