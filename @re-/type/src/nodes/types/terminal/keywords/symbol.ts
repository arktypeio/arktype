import { typeNode } from "./type.js"

export class symbolNode extends typeNode {
    toString() {
        return "symbol"
    }

    allowsValue(value: unknown) {
        return typeof value === "symbol"
    }

    create(): symbol {
        return Symbol()
    }
}
