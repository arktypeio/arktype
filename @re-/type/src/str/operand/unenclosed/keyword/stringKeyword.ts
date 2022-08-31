import { isAlpha, isAlphaNumeric } from "@re-/tools"
import { boundableNode, Node, terminalNode } from "./common.js"

abstract class BaseStringKeyword extends terminalNode implements boundableNode {
    allows(args: Node.Allows.Args) {
        if (typeof args.value === "string" && this.allowsString(args.value)) {
            return true
        }
        this.addUnassignable(args)
        return false
    }

    abstract allowsString(value: string): boolean

    create() {
        return ""
    }

    readonly units = "characters"

    checkSize(value: string) {
        return value.length
    }
}

class StringKeyword extends BaseStringKeyword {
    allowsString() {
        return true
    }
}

class EmailKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return /^(.+)@(.+)\.(.+)$/.test(value)
    }

    override create() {
        return "david@redo.dev"
    }
}

class AlphaKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return isAlpha(value)
    }
}

class AlphaNumKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return isAlphaNumeric(value)
    }
}

class LowerKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return value === value.toLowerCase()
    }
}

class UpperKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return value === value.toUpperCase()
    }
}

export const stringKeywordsToNodes = {
    string: StringKeyword,
    email: EmailKeyword,
    alpha: AlphaKeyword,
    alphanum: AlphaNumKeyword,
    lower: LowerKeyword,
    upper: UpperKeyword
}
