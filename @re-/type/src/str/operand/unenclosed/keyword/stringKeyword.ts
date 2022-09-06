import { isAlpha, isAlphaNumeric } from "@re-/tools"
import {
    BoundsDefinition,
    BoundViolationDiagnostic,
    checkBound
} from "../../../operator/bound/bound.js"
import { constrainable, Node, terminalNode } from "./common.js"

export type stringConstraints = {
    regex?: regexConstraint
    bounds?: BoundsDefinition
}

export class RegexMismatchDiagnostic extends Node.Allows
    .Diagnostic<"RegexMismatch"> {
    constructor(args: Node.Allows.Args, definition: string) {
        super("RegexMismatch", args, definition)
    }

    message = `'${this.data}' does not match expression ${this.definition}.`
}

export class regexConstraint extends Node.constraint<RegExp, string> {
    check(args: Node.Allows.Args<string>) {
        if (!this.definition.test(args.value)) {
            return args.diagnostics.push(
                new RegexMismatchDiagnostic(args, `/${this.definition}/`)
            )
        }
    }
}

export class stringNode
    extends terminalNode
    implements constrainable<stringConstraints>
{
    constructor(def: string, public constraints: stringConstraints) {
        super(def)
    }

    allows(args: Node.Allows.Args) {
        if (typeof args.value !== "string") {
            args.diagnostics.push(
                new Node.Allows.UnassignableDiagnostic(args, this)
            )
            return false
        }
        if (this.constraints.bounds) {
            for (const bound of this.constraints.bounds) {
                if (!checkBound(args.value.length, bound)) {
                    args.diagnostics.push(
                        new BoundViolationDiagnostic(args, this)
                    )
                }
            }
        }
        return true
    }

    create() {
        return ""
    }

    readonly units = "characters"

    checkSize(value: string) {
        return value.length
    }
}

// export class StringKeyword extends BaseStringKeyword {
//     allowsString() {
//         return true
//     }
// }

// export class EmailKeyword extends BaseStringKeyword {
//     allowsString(value: string) {
//         return /^(.+)@(.+)\.(.+)$/.test(value)
//     }

//     override create() {
//         return "david@redo.dev"
//     }
// }

// export class AlphaKeyword extends BaseStringKeyword {
//     allowsString(value: string) {
//         return isAlpha(value)
//     }
// }

// export class AlphaNumKeyword extends BaseStringKeyword {
//     allowsString(value: string) {
//         return isAlphaNumeric(value)
//     }
// }

// export class LowerKeyword extends BaseStringKeyword {
//     allowsString(value: string) {
//         return value === value.toLowerCase()
//     }
// }

// export class UpperKeyword extends BaseStringKeyword {
//     allowsString(value: string) {
//         return value === value.toUpperCase()
//     }
// }

// export const stringKeywordsToNodes = {
//     string: StringKeyword,
//     email: EmailKeyword,
//     alpha: AlphaKeyword,
//     alphanum: AlphaNumKeyword,
//     lower: LowerKeyword,
//     upper: UpperKeyword
// }
