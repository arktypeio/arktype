import { boundableNode, boundsConstraint } from "../../../constraints/bounds.js"
import { typeNode } from "./type.js"

export class numberNode extends typeNode implements boundableNode {
    bounds: boundsConstraint | undefined = undefined

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
