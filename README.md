# Persistent Priority Queue

A file-persistent, double-ended priority queue implemented in JavaScript (Node.js).  
Supports `extract_min`, `extract_max`, and all standard priority queue operations with state durability across restarts.

## Features

- Extract both minimum and maximum priority items efficiently
- State persists across program restarts via append-only write-ahead log
- O(1) lookups by ID using a Hash Map, enabling fast updates and deletes
- Zero external dependencies — built entirely with Node.js standard library

## Project Structure

```
persistent-priority-queue/
├── module.js          # Main entry point — exports PersistentPriorityQueue
├── lib/
│   ├── queue.js       # In-memory dual-heap priority queue
│   └── storage.js     # WAL-based persistence layer
├── example.js         # Usage demonstration
├── package.json
├── .gitignore
└── README.md
```

## Data Structure

The in-memory queue uses three data structures working together:

| Structure    | Purpose                                   |
|-------------|-------------------------------------------|
| **Hash Map** | O(1) item lookup by unique ID             |
| **Min-Heap** | Efficiently yields the lowest priority    |
| **Max-Heap** | Efficiently yields the highest priority   |

**Lazy deletion** is used to handle `update` and `delete` without expensive heap searches.  
When an item is updated or deleted, the Hash Map reference changes immediately. Stale entries in the heaps are discarded during extraction.

## Persistence

The queue uses an append-only write-ahead log for durability:

- Every mutation (`insert`, `update`, `delete`, `extract`) is appended as a single JSON line to a `.wal` file
- On startup, `init()` replays the log sequentially to reconstruct the in-memory state
- Corrupted or incomplete entries (e.g., from a crash mid-write) are silently skipped
- A `compact()` method rewrites the log as a minimal set of `insert` operations reflecting current state

## API

```javascript
const PersistentPriorityQueue = require('./module');

const pq = new PersistentPriorityQueue('data.wal');
await pq.init();
```

| Method                          | Description                                                    |
|---------------------------------|----------------------------------------------------------------|
| `insert(id, priority, data)`    | Add a new item. Throws if `id` already exists.                 |
| `extract_min()`                 | Remove and return the lowest-priority item. Returns `null` if empty. |
| `extract_max()`                 | Remove and return the highest-priority item. Returns `null` if empty. |
| `peek()`                        | Return `{ min, max }` without removing. Either may be `null`.  |
| `update(id, newPriority, data)` | Update an existing item. Throws if `id` does not exist.        |
| `delete(id)`                    | Remove an item by ID. Returns `true` if found, `false` otherwise. |
| `is_empty()`                    | Returns `true` if the queue has no items.                      |
| `close()`                       | Flushes the WAL stream. Returns a Promise.                     |
| `compact()`                     | Rewrites the WAL to remove redundant entries. Returns a Promise. |

## Time Complexity

| Operation     | Complexity      | Notes                                                       |
|---------------|-----------------|-------------------------------------------------------------|
| `insert`      | O(log N)        | Pushes to both heaps with bubble-up                         |
| `extract_min` | O(log N) amort. | Pops min-heap root, skipping any stale tombstone entries     |
| `extract_max` | O(log N) amort. | Pops max-heap root, skipping any stale tombstone entries     |
| `peek`        | O(1) amort.     | Reads heap roots after purging stale entries                 |
| `update`      | O(log N) amort. | O(1) map update + O(log N) push; old entries become stale   |
| `delete`      | O(1)            | Removes from Hash Map; heap entries become stale             |
| `is_empty`    | O(1)            | Checks Hash Map size                                        |

> Stale entries are cleaned lazily during `extract` and `peek` operations.

## Installation

```bash
git clone https://github.com/<your-username>/persistent-priority-queue.git
cd persistent-priority-queue
```

No `npm install` required — zero external dependencies.

## Running

```bash
npm start
```

## Example

```javascript
const PersistentPriorityQueue = require('./module');

async function main() {
    const pq = new PersistentPriorityQueue('tasks.wal');
    await pq.init();

    pq.insert('job-1', 10, { task: 'send email' });
    pq.insert('job-2', 50, { task: 'generate report' });

    pq.update('job-1', 100, { task: 'send email (urgent)' });

    console.log(pq.extract_max()); // job-1, priority 100
    console.log(pq.extract_min()); // job-2, priority 50

    await pq.close();
}
main();
```

## Real-World Use Cases

1. **Job Scheduling** — Process high-priority background jobs before lower-priority ones (e.g., premium vs. free-tier users).
2. **Shortest Path Algorithms** — Dijkstra's and A* use a min-priority queue to greedily select the nearest unvisited node.
3. **Network Traffic Shaping** — Routers prioritize real-time traffic (VoIP, video) over bulk downloads using priority queues.
4. **Huffman Coding** — The compression algorithm repeatedly extracts the two lowest-frequency nodes to build an optimal prefix tree.
5. **Task Scheduling in Operating Systems** — The kernel scheduler uses priority queues to decide which process runs next.

## Design Decisions

- **Dual Heaps over a Balanced BST:** An AVL or Red-Black tree supports all operations in O(log N), but is significantly more complex to implement correctly and has higher constant-factor overhead. Array-based heaps are cache-friendly and straightforward.
- **Lazy Deletion over Index Tracking:** Maintaining heap indices in the Hash Map as nodes swap during bubble-up/down is error-prone. Lazy deletion avoids this entirely — stale entries are discarded naturally during extraction.
- **Write-Ahead Log over Full-State Serialization:** Appending a single JSON line per mutation is O(1) I/O. Rewriting the entire state on every change would be O(N). The WAL approach scales well and supports crash recovery.
