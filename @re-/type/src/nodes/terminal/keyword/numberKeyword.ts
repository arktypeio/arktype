import { Base } from "../../base/index.js"
import { Bounds } from "../../nonTerminal/bounds.js"
import { Terminal } from "../terminal.js"

abstract class BaseNumberKeyword extends Terminal implements Bounds.Boundable {
    allows(args: Base.Validation.Args) {
        if (typeof args.value === "number" && this.allowsNumber(args.value)) {
            return true
        }
        this.addUnassignable(args)
        return false
    }

    abstract allowsNumber(value: number): boolean

    generate() {
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
