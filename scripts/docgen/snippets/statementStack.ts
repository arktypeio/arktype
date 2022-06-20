const DELIMITER = "$$block_start$$"

export class StatementStack {
    private statements: string[] = []

    push(item: string, delimiter?: boolean) {
        if (delimiter) {
            this.statements.push(DELIMITER)
        } else {
            this.statements.push(item)
        }
    }

    pop() {
        return this.statements.pop()
    }

    peek() {
        return this.statements[this.size() - 1]
    }

    size() {
        return this.statements.length
    }
    getCopyOfStorage() {
        return [...this.statements]
    }

    toString() {
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
            this.statements = copyWithDelimiterRemoved
        }
        return str
    }
}
