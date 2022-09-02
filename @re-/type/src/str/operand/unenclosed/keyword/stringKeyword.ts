import { isAlpha, isAlphaNumeric } from "@re-/tools"
import { boundableNode, Node, terminalNode } from "./common.js"

abstract class BaseStringKeyword extends terminalNode implements boundableNode {
    allows(args: Node.Allows.Args) {
        if (typeof args.value === "string" && this.allowsString(args.value)) {
            return true
        }
        args.diagnostics.push(
            new Node.Allows.UnassignableDiagnostic(args, this)
        )
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

export class StringKeyword extends BaseStringKeyword {
    allowsString() {
        return true
    }
}

export class EmailKeyword extends BaseStringKeyword {
    allowsString(value: string) {
        return /^(.+)@(.+)\.(.+)$/.test(value)
    }

    override create() {
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

export const stringKeywordsToNodes = {
    string: StringKeyword,
    email: EmailKeyword,
    alpha: AlphaKeyword,
    alphanum: AlphaNumKeyword,
    lower: LowerKeyword,
    upper: UpperKeyword
}
