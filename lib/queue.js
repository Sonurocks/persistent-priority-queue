'use strict';

class Heap {
    constructor(compare) {
        this.data = [];
        this.compare = compare;
    }

    push(item) {
        this.data.push(item);
        this._bubbleUp(this.data.length - 1);
    }

    pop() {
        if (this.data.length === 0) return null;
        const top = this.data[0];
        const bottom = this.data.pop();
        if (this.data.length > 0) {
            this.data[0] = bottom;
            this._bubbleDown(0);
        }
        return top;
    }

    peek() {
        return this.data.length > 0 ? this.data[0] : null;
    }

    _bubbleUp(index) {
        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            if (this.compare(this.data[index], this.data[parent]) < 0) {
                this._swap(index, parent);
                index = parent;
            } else {
                break;
            }
        }
    }

    _bubbleDown(index) {
        const length = this.data.length;
        while (true) {
            let left = 2 * index + 1;
            let right = 2 * index + 2;
            let target = index;

            if (left < length && this.compare(this.data[left], this.data[target]) < 0) {
                target = left;
            }
            if (right < length && this.compare(this.data[right], this.data[target]) < 0) {
                target = right;
            }

            if (target !== index) {
                this._swap(index, target);
                index = target;
            } else {
                break;
            }
        }
    }

    _swap(i, j) {
        [this.data[i], this.data[j]] = [this.data[j], this.data[i]];
    }
}

class DualHeapPriorityQueue {
    constructor() {
        this.itemMap = new Map();
        this.minHeap = new Heap((a, b) => a.priority - b.priority);
        this.maxHeap = new Heap((a, b) => b.priority - a.priority);
    }

    insert(id, priority, data) {
        if (this.itemMap.has(id)) {
            throw new Error(`Item with id "${id}" already exists. Use update() instead.`);
        }
        const item = { id, priority, data };
        this.itemMap.set(id, item);
        this.minHeap.push(item);
        this.maxHeap.push(item);
    }

    _purgeStale(heap) {
        while (heap.peek()) {
            if (this.itemMap.get(heap.peek().id) !== heap.peek()) {
                heap.pop();
            } else {
                break;
            }
        }
    }

    extract_min() {
        this._purgeStale(this.minHeap);
        const item = this.minHeap.pop();
        if (item) {
            this.itemMap.delete(item.id);
            return { id: item.id, priority: item.priority, data: item.data };
        }
        return null;
    }

    extract_max() {
        this._purgeStale(this.maxHeap);
        const item = this.maxHeap.pop();
        if (item) {
            this.itemMap.delete(item.id);
            return { id: item.id, priority: item.priority, data: item.data };
        }
        return null;
    }

    peek() {
        this._purgeStale(this.minHeap);
        this._purgeStale(this.maxHeap);
        const min = this.minHeap.peek();
        const max = this.maxHeap.peek();
        return {
            min: min ? { id: min.id, priority: min.priority, data: min.data } : null,
            max: max ? { id: max.id, priority: max.priority, data: max.data } : null,
        };
    }

    update(id, newPriority, newData) {
        if (!this.itemMap.has(id)) {
            throw new Error(`Item with id "${id}" does not exist.`);
        }
        const newItem = { id, priority: newPriority, data: newData };
        this.itemMap.set(id, newItem);
        this.minHeap.push(newItem);
        this.maxHeap.push(newItem);
    }

    delete(id) {
        if (!this.itemMap.has(id)) {
            return false;
        }
        this.itemMap.delete(id);
        return true;
    }

    is_empty() {
        return this.itemMap.size === 0;
    }
}

module.exports = { DualHeapPriorityQueue };
