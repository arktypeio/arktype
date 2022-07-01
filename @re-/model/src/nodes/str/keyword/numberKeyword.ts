import { Base } from "../base.js"
import { Bound } from "../bound.js"

abstract class BaseNumberKeyword
    extends Base.Leaf<string>
    implements Bound.Boundable
{
    allows(args: Base.Validation.Args) {
        return typeof args.value === "number" && this.allowsNumber(args.value)
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

export class PositiveKeyword extends BaseNumberKeyword {
    allowsNumber(value: number) {
        return value > 0
    }

    override generate() {
        return 1
    }
}

export class NonNegativeKeyword extends BaseNumberKeyword {
    allowsNumber(value: number) {
        return value >= 0
    }
}
