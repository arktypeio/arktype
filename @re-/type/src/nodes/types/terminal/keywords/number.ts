export class numberNode extends typeNode implements boundableNode {
    bounds: boundsConstraint | undefined = undefined

    toString() {
        return "number"
    }

    allowsValue(value: unknown) {
        return typeof value === "number"
    }

    create(): string {
        return ""
    }
}
