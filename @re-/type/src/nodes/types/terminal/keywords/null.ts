import { typeNode } from "./type.js"

export class nullNode extends typeNode {
    toString() {
        return "null"
    }

    allowsValue(data: unknown) {
        return data === null
    }

    create(): null {
        return null
    }
}
