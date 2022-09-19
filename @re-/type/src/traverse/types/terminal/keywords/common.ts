import { startsWithVowel } from "@re-/tools"
import { Allows } from "../../../allows.js"
import { Keyword } from "./keyword.js"

// These keywords should not be preceded by an article (e.g. 'must be null' is preferable to 'must be a null')
const DESCRIPTIVE_KEYWORDS: Partial<Record<Keyword.TypeKeyword, 1>> = {
    any: 1,
    never: 1,
    null: 1,
    undefined: 1,
    unknown: 1
}

export class KeywordDiagnostic extends Allows.Diagnostic<"Keyword"> {
    public message: string

    constructor(public type: Keyword.TypeKeyword, args: Allows.Args) {
        super("Keyword", args)
        let message = "Must be "
        if (type in DESCRIPTIVE_KEYWORDS) {
            message += type
        } else if (startsWithVowel(type)) {
            message += `an ${type}`
        } else {
            message += `a ${type}`
        }
        message += ` (got ${args.data === null ? "null" : typeof args.data}).`
        this.message = message
    }
}
