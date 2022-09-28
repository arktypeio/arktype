import { Generate } from "../../traverse/exports.js"
import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NeverNode extends TerminalNode<"never"> {
    constructor() {
        super("never")
    }

    check(state: Check.CheckState) {
        addTypeKeywordDiagnostic(state, "never", "Never allowed")
    }

    generate(): never {
        throw new Generate.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}
