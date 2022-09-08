import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { typeNode } from "./type.js"

export class numberNode extends typeNode implements boundableNode {
    bounds: bounds | undefined = undefined

    toString() {
        return "number"
    }

    allowsValue(data: unknown) {
        return typeof data === "number"
    }

    create(): string {
        return ""
    }
}
