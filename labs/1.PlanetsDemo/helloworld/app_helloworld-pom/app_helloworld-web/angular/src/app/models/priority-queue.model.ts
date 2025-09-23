/**
 * This class represents a special kind of priority queue which priorities based on rank.
 * Lower the rank, the higher the priority. You cannot have duplicate entries inside this queue.
 * If we try to add a duplicate, the enqueue function will not insert into the queue and returns false.
 */
export class PriorityQueue<T> implements Iterable<T> {
    private head: PQNode<T>;
    private tail: PQNode<T>;
    private nodeMap: Map<T, PQNode<T>> = new Map<T, PQNode<T>>();

    /**
     * Add an element according to the given priority. The value is not added if already present in the queue.
     *
     * @param value the value to add
     * @param rank the rank of the value (lesser the rank, more the priority)
     * @returns true if element was added, otherwise false
     */
    public enqueue(value: T, rank: number): boolean {
        if (this.has(value)) {
            return false;
        }
        let node: PQNode<T> = new PQNode(rank, value);
        // Update the node map
        this.nodeMap.set(value, node);
        // Queue empty
        if (this.isEmpty()) {
            // Add at the head
            this.head = this.tail = node;
            return true;
        }
        // Check if the priority is higher than first node
        if (this.head.rank > rank) {
            node.next = this.head;
            this.head.prev = node;
            this.head = node;
            return true;
        }
        let lastNode = this.head;
        let currNode = this.head.next;
        // Iterate through queue
        while (currNode) {
            // If the current node has higher priority, add the node before it
            if (currNode.rank > rank) {
                node.next = currNode;
                node.prev = lastNode;
                currNode.prev = node;
                lastNode.next = node;
                return true;
            }
            lastNode = currNode;
            currNode = currNode.next;
        }
        // Should be added at the end since no node hash higher priority
        this.tail.next = node;
        node.prev = this.tail;
        this.tail = node;
    }

    /**
     * Remove a value from the queue
     *
     * @param value the value to remove
     * @returns true if the removal was successful, otherwise false
     */
    public remove(value: T): boolean {
        // Node is not present in the map, then we can't remove something which is not already part.
        if (!this.nodeMap.has(value)) {
            return false;
        }
        let node: PQNode<T> = this.nodeMap.get(value);
        if (node !== this.head) {
            node.prev.next = node.next;
        } else {
            // Delete at start
            this.head = node.next;
        }
        if (node !== this.tail) {
            node.next.prev = node.prev;
        } else {
            // Delete at end
            this.tail = node.prev;
        }
        return this.nodeMap.delete(value);
    }

    /**
     * Check if the given value is already part of the queue.
     *
     * @param value the value to check
     * @returns true if already present
     */
    public has(value: T): boolean {
        return this.nodeMap.has(value);
    }

    /**
     * Check if the queue is empty or not
     */
    public isEmpty(): boolean {
        return !this.head && !this.tail;
    }

    /**
     * Get the iterator for the class
     */
    [Symbol.iterator](): Iterator<T> {
        return new PQIterator<T>(this.head);
    }

    /**
     * Get an iterable starting from a particular Value
     * @param value the value the iterable should start from
     * @returns an Iterable which starts from the given value
     */
    iterableFrom(value: T): Iterable<T> {
        return new PQIterable(new PQIterator<T>(value ? this.nodeMap.get(value) : this.head));
    }
}

/**
 * An iterable class representing an iterable for priority queue
 */
class PQIterable<T> implements Iterable<T> {
    constructor(private iterator: PQIterator<T>) {
    }

    [Symbol.iterator](): Iterator<T> {
        return this.iterator;
    }
}

/**
 * An iterator class representing an iterator for priority queue
 */
class PQIterator<T> implements Iterator<T> {
    constructor(private current: PQNode<T>) {
    }

    next(): IteratorResult<T> {
        let result: IteratorResult<T> = {
            done: this.current === undefined,
            value: this.current?.value,
        };
        if (this.current) {
            this.current = this.current.next
        }
        return result;
    }
}

/**
 * This class represents a Priority Queue Node.
 * This is intended only to be used inside PriorityQueue.
 * The properties of this class are readonly.
 */
class PQNode<T> {
    /**
     * Constructor for a new PQ Node
     * @param rank the rank of the node
     * @param value the value hold by the node
     */
    constructor(public readonly rank: number, public readonly value: T) {
    }

    /**
     * The node with higher rank or equal rank and created later than the current node.
     */
    next: PQNode<T>;

    /**
     * The node with lower rank or equal rank and created earlier than the current node.
     */
    prev: PQNode<T>;
}
