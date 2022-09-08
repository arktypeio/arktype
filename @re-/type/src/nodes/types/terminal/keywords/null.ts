import { typeNode } from "./type.js"

export class nullNode extends typeNode {
    toString() {
        return "null"
    }

    allowsValue(value: unknown) {
        return value === null
    }

    create(): null {
        return null
    }
}
