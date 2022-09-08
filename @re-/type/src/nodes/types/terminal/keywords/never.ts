import { typeNode } from "../type.js.js.js"

export class neverNode extends typeNode {
    toString() {
        return "never"
    }

    allowsValue() {
        return false
    }

    create(): never {
        throw new Node.Create.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}
