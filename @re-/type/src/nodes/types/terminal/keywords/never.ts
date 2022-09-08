import { typeNode } from "../type.js"

export class neverNode extends typeNode {
    toString() {
        return "never"
    }

    allowsValue() {
        return false
    }

    create(): never {
        throw new Nodes.Create.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}
