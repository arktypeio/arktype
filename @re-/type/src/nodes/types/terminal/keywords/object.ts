import { typeNode } from "../type.js.js.js"

export class objectNode extends typeNode {
    toString() {
        return "object"
    }

    allowsValue(value: unknown) {
        return typeof value === "object" && value !== null
    }

    create(): object {
        return {}
    }
}
