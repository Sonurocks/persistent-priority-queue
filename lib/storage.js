'use strict';

const fs = require('fs');
const readline = require('readline');
const { DualHeapPriorityQueue } = require('./queue');

class PersistentPriorityQueue {
    constructor(walFilePath) {
        this.queue = new DualHeapPriorityQueue();
        this.walFilePath = walFilePath;
        this.walStream = null;
    }

    async init() {
        if (fs.existsSync(this.walFilePath)) {
            const rl = readline.createInterface({
                input: fs.createReadStream(this.walFilePath),
                crlfDelay: Infinity
            });

            for await (const line of rl) {
                if (!line.trim()) continue;
                try {
                    this._applyOperation(JSON.parse(line));
                } catch (e) {
                    // Skip corrupted or incomplete WAL entries gracefully
                }
            }
        }

        this.walStream = fs.createWriteStream(this.walFilePath, { flags: 'a' });
    }

    _applyOperation(op) {
        try {
            switch (op.type) {
                case 'insert':     this.queue.insert(op.id, op.priority, op.data); break;
                case 'update':     this.queue.update(op.id, op.priority, op.data); break;
                case 'delete':     this.queue.delete(op.id); break;
                case 'extract_min': this.queue.extract_min(); break;
                case 'extract_max': this.queue.extract_max(); break;
            }
        } catch (e) { /* ignore replay errors */ }
    }

    _log(op) {
        if (this.walStream) {
            this.walStream.write(JSON.stringify(op) + '\n');
        }
    }

    insert(id, priority, data) {
        this.queue.insert(id, priority, data);
        this._log({ type: 'insert', id, priority, data });
    }

    extract_min() {
        const result = this.queue.extract_min();
        if (result) this._log({ type: 'extract_min' });
        return result;
    }

    extract_max() {
        const result = this.queue.extract_max();
        if (result) this._log({ type: 'extract_max' });
        return result;
    }

    peek() {
        return this.queue.peek();
    }

    update(id, newPriority, newData) {
        this.queue.update(id, newPriority, newData);
        this._log({ type: 'update', id, priority: newPriority, data: newData });
    }

    delete(id) {
        const success = this.queue.delete(id);
        if (success) this._log({ type: 'delete', id });
        return success;
    }

    is_empty() {
        return this.queue.is_empty();
    }

    close() {
        return new Promise((resolve) => {
            if (this.walStream) {
                this.walStream.end(() => {
                    this.walStream = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async compact() {
        const tmpPath = `${this.walFilePath}.tmp`;
        if (this.walStream) this.walStream.end();

        const stream = fs.createWriteStream(tmpPath);
        for (const [id, item] of this.queue.itemMap.entries()) {
            stream.write(JSON.stringify({ type: 'insert', id, priority: item.priority, data: item.data }) + '\n');
        }
        stream.end();

        await new Promise(resolve => stream.on('finish', resolve));
        fs.renameSync(tmpPath, this.walFilePath);
        this.walStream = fs.createWriteStream(this.walFilePath, { flags: 'a' });
    }
}

module.exports = { PersistentPriorityQueue };
