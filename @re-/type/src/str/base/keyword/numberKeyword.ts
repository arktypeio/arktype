import { BoundableNode } from "../../../affix/bound/index.js.js"
import { TerminalNode } from "../../../node/terminal.js"
import { Base } from "../../parser/index.js.js"

abstract class BaseNumberKeyword extends TerminalNode implements BoundableNode {
    allows(args: Node.Allows.Args) {
        if (typeof args.value === "number" && this.allowsNumber(args.value)) {
            return true
        }
        this.addUnassignable(args)
        return false
    }

    abstract allowsNumber(value: number): boolean

    create() {
        return 0
    }

    toBound(value: number) {
        return value
    }
}

export type NumberKeywordNode = typeof BaseNumberKeyword

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
