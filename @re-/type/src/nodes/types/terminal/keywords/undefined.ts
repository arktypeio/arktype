import { typeNode } from "./type.js"

export class undefinedNode extends typeNode {
    toString() {
        return "undefined"
    }

    allows(data: unknown) {
        return data === undefined
    }

    create(): undefined {
        return undefined
    }
}
