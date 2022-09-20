import type { Allows } from "../../allows.js"
import { Generate } from "../../generate.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class NeverNode extends TerminalNode {
    check(args: Allows.Args) {
        args.diagnostics.push(new KeywordDiagnostic("never", args))
    }

    generate(): never {
        throw new Generate.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}
