import { typeNode } from "./type.js"

export class unknownNode extends typeNode {
    toString() {
        return "unknown"
    }
    allowsValue() {
        return true
    }

    create(): unknown {
        return undefined
    }
}
