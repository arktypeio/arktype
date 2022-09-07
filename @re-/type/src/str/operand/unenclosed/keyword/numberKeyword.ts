import { boundableNode, Node, terminalNode } from "./common.js"

abstract class BaseNumberKeyword extends terminalNode implements boundableNode {
    allows(args: Node.Allows.Args) {
        if (typeof args.data === "number" && this.allowsNumber(args.data)) {
            return true
        }
        args.diagnostics.push(
            new Node.Allows.UnassignableDiagnostic(this.toString(), args)
        )
        return false
    }

    abstract allowsNumber(value: number): boolean

    create() {
        return 0
    }

    checkSize(value: number) {
        return value
    }
}

export class NumberKeyword extends BaseNumberKeyword {
    allowsNumber() {
        return true
    }
}

export class IntegerKeyword extends BaseNumberKeyword {
    allowsNumber(value: number) {
        return Number.isInteger(value)
    }
}

export const numberKeywordsToNodes = {
    number: new NumberKeyword("number"),
    integer: new IntegerKeyword("integer")
}
