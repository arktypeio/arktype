import { startsWithVowel } from "@re-/tools"
import { Allows } from "../../allows.js"
import type { TypeKeyword } from "./keyword.js"

// These keywords should not be preceded by an article (e.g. 'must be null' is preferable to 'must be a null')
const DESCRIPTIVE_KEYWORDS: Partial<Record<TypeKeyword, 1>> = {
    any: 1,
    never: 1,
    null: 1,
    undefined: 1,
    unknown: 1
}

export class KeywordDiagnostic extends Allows.Diagnostic<"keyword"> {
    constructor(keyword: TypeKeyword, args: Allows.Args) {
        let reason = "Must be "
        if (keyword in DESCRIPTIVE_KEYWORDS) {
            reason += keyword
        } else if (startsWithVowel(keyword)) {
            reason += `an ${keyword}`
        } else {
            reason += `a ${keyword}`
        }
        reason += ` (got ${args.data === null ? "null" : typeof args.data}).`
        super("keyword", keyword, args, { reason })
        this.message = reason
    }
}
