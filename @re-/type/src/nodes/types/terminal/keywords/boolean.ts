import { typeNode } from "../type.js"

export class booleanNode extends typeNode {
    toString() {
        return "boolean"
    }

    allowsValue(value: unknown) {
        return typeof value === "boolean"
    }

    create(): boolean {
        return false
    }
}
