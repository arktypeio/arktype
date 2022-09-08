export class trueNode extends typeNode {
    toString() {
        return "true"
    }

    allowsValue(value: unknown) {
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

    allowsValue(value: unknown) {
        return value === false
    }

    create(): false {
        return false
    }
}
