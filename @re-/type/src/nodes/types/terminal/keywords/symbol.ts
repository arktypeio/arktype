import { typeNode } from "./type.js"

export class symbolNode extends typeNode {
    toString() {
        return "symbol"
    }

    allows(data: unknown) {
        return typeof data === "symbol"
    }

    create(): symbol {
        return Symbol()
    }
}
