export class trueNode extends typeNode {
    toString() {
        return "true"
    }

    allowsValue(data: unknown) {
        return value === true
    }

    create(): true {
        return true
    }
}

export class falseNode extends typeNode {
    toString() {
        return "false"
    }

    allowsValue(data: unknown) {
        return value === false
    }

    create(): false {
        return false
    }
}
