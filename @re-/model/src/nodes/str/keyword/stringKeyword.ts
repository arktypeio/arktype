import { isAlpha, isAlphaNumeric } from "@re-/tools"
import { Base } from "../base.js"
import { Bound } from "../bound.js"

abstract class BaseStringKeyword
    extends Base.Leaf<string>
    implements Bound.Boundable
{
    allows(args: Base.Validation.Args) {
        return typeof args.value === "string" && this.allowsString(args.value)
    }

    abstract allowsString(value: string): boolean

    generate() {
        return ""
    }

    boundBy = "characters"

    toBound(value: string) {
        return value.length
    }
}

export type StringKeywordNode = typeof BaseStringKeyword

export class StringKeyword extends BaseStringKeyword {
    allowsString() {
        return true
    }
}

export class EmailKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return /^(.+)@(.+)\.(.+)$/.test(value)
    }

    override generate() {
        return "david@redo.dev"
    }
}

export class AlphaKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return isAlpha(value)
    }
}

export class AlphaNumericKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return isAlphaNumeric(value)
    }
}

export class LowercaseKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return value === value.toLowerCase()
    }
}

export class UppercaseKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return value === value.toUpperCase()
    }
}

export class CharacterKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return value.length === 1
    }

    override generate() {
        return "a"
    }
}
