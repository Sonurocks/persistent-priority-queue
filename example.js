'use strict';

const PersistentPriorityQueue = require('./module');
const path = require('path');
const fs = require('fs');

async function main() {
    const walFile = path.join(__dirname, 'queue_data.wal');
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);

    const pq = new PersistentPriorityQueue(walFile);
    await pq.init();

    pq.insert('task-1', 10, { description: 'Low priority task' });
    pq.insert('task-2', 100, { description: 'High priority task' });
    pq.insert('task-3', 50, { description: 'Medium priority task' });

    console.log('is_empty:', pq.is_empty());
    console.log('peek:', pq.peek());

    console.log('extract_max:', pq.extract_max());

    pq.update('task-1', 200, { description: 'Escalated to critical' });
    console.log('peek after update:', pq.peek());

    console.log('extract_min:', pq.extract_min());

    pq.delete('task-1');
    console.log('is_empty after delete:', pq.is_empty());

    await pq.close();
}

main().catch(console.error);
