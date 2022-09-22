import type { Allows } from "../../allows.js"
import { Generate } from "../../generate.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NeverNode extends TerminalNode {
    check(args: Allows.Args) {
        addTypeKeywordDiagnostic(args, "never", "Never allowed")
    }

    generate(): never {
        throw new Generate.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}
