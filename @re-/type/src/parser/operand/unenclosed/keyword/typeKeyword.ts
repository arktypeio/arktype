import {
    boundableNode,
    boundsConstraint
} from "../../../operator/bound/bound.js"
import { regexConstraint } from "../../index.js"
import { Node, terminalNode } from "./common.js"

abstract class typeNode extends terminalNode {
    allows(args: Node.Allows.Args) {
        if (this.allowsValue(args.data)) {
            return true
        }
        args.diagnostics.push(
            new Node.Allows.UnassignableDiagnostic(this.toString(), args)
        )
        return false
    }

    abstract allowsValue(value: unknown): boolean
}

export class trueNode extends typeNode {
    toString() {
        return "true"
    }

    allowsValue(value: unknown) {
        return value === true
    }

    create(): true {
        return true
    }
}

export class falseNode extends typeNode {
    toString() {
        return "false"
    }

    allowsValue(value: unknown) {
        return value === false
    }

    create(): false {
        return false
    }
}
