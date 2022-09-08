import { typeNode } from "./type.js"

export class undefinedNode extends typeNode {
    toString() {
        return "undefined"
    }

    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): undefined {
        return undefined
    }
}
