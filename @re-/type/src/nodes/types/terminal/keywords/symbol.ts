import { typeNode } from "./type.js"

export class symbolNode extends typeNode {
    toString() {
        return "symbol"
    }

    allowsValue(data: unknown) {
        return typeof data === "symbol"
    }

    create(): symbol {
        return Symbol()
    }
}
