import { Generate } from "../../traverse/exports.js"
import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NeverNode extends TerminalNode {
    check(args: Check.CheckArgs) {
        addTypeKeywordDiagnostic(args, "never", "Never allowed")
    }

    generate(): never {
        throw new Generate.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}
