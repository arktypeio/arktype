const DEFAULT_STACK_CAPACITY = 30
const DELIMITER = "$$block_start$$"

export class StatementStack {
    private storage: string[] = []

    constructor(private capacity: number = DEFAULT_STACK_CAPACITY) {}
    push(item: string, delimiter?: boolean): void {
        if (this.size() === this.capacity) {
            throw new Error(
                "Stack has reached max capacity, you cannot add more items"
            )
        }
        if (delimiter) {
            this.storage.push(DELIMITER)
        } else {
            this.storage.push(item)
        }
    }

    pop(): string | undefined {
        return this.storage.pop()
    }

    peek(): string | undefined {
        return this.storage[this.size() - 1]
    }

    size(): number {
        return this.storage.length
    }
    getCopyOfStorage(): string[] {
        return [...this.storage]
    }
    setStorage(storage: string[]): void {
        this.storage = storage
    }

    storageToString(): string {
        let str = ""
        const copy = this.getCopyOfStorage()
        while (this.peek() !== DELIMITER && this.peek() !== undefined) {
            str = `${this.pop()}\n${str}`
        }
        if (
            this.peek() !== undefined &&
            copy.lastIndexOf(DELIMITER) !== copy.indexOf(DELIMITER)
        ) {
            const copyWithDelimiterRemoved = [
                ...copy.slice(0, copy.lastIndexOf(DELIMITER)),
                ...copy.slice(copy.lastIndexOf(DELIMITER) + 1, copy.length)
            ]
            this.setStorage(copyWithDelimiterRemoved)
        }
        return str
    }
}
