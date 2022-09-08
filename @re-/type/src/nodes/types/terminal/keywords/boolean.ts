import { typeNode } from "./type.js"

export class booleanNode extends typeNode {
    toString() {
        return "boolean"
    }

    allowsValue(data: unknown) {
        return typeof data === "boolean"
    }

    create(): boolean {
        return false
    }
}
