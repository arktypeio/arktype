import { boundableNode, bounds } from "../../../constraints/bounds.js"
import { typeNode } from "./type.js"

export class numberNode extends typeNode implements boundableNode {
    bounds: bounds | undefined = undefined

    toString() {
        return "number"
    }

    allowsValue(value: unknown) {
        return typeof value === "number"
    }

    create(): string {
        return ""
    }
}
