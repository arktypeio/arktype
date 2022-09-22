import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class NullNode extends TerminalNode {
    check(args: Allows.Args) {
        if (args.data !== null) {
            addTypeKeywordDiagnostic(args, "null", "Must be null")
        }
    }

    generate(): null {
        return null
    }
}
