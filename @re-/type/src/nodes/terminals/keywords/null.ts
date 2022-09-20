import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class NullNode extends TerminalNode {
    check(args: Allows.Args) {
        if (args.data !== null) {
            args.diagnostics.push(new KeywordDiagnostic("null", args))
        }
    }

    generate(): null {
        return null
    }
}
