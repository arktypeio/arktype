import { isAlpha, isAlphaNumeric } from "@re-/tools"
import { Base } from "../../base/index.js"
import { Boundable } from "../../nonTerminal/bound/node.js"
import { TerminalNode } from "../node.js"

abstract class BaseStringKeyword extends TerminalNode implements Boundable {
    allows(args: Base.Validation.Args) {
        if (typeof args.value === "string" && this.allowsString(args.value)) {
            return true
        }
        this.addUnassignable(args)
        return false
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

export class AlphaNumKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return isAlphaNumeric(value)
    }
}

export class LowerKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return value === value.toLowerCase()
    }
}

export class UpperKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return value === value.toUpperCase()
    }
}
