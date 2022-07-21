import { Base } from "../base.js"
import { Bound } from "../bound.js"

abstract class BaseNumberKeyword
    extends Base.Leaf<string>
    implements Bound.Boundable
{
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
