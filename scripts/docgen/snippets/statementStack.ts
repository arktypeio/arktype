const DELIMITER = "$$block_start$$"

export class StatementStack {
    private storage: string[] = []

    push(item: string, delimiter?: boolean) {
        if (delimiter) {
            this.storage.push(DELIMITER)
        } else {
            this.storage.push(item)
        }
    }

    pop() {
        return this.storage.pop()
    }

    peek() {
        return this.storage[this.size() - 1]
    }

    size() {
        return this.storage.length
    }
    getCopyOfStorage() {
        return [...this.storage]
    }
    setStorage(storage: string[]) {
        this.storage = storage
    }

    storageToString() {
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
