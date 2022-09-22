import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class BooleanNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "boolean") {
            addTypeKeywordDiagnostic(args, "boolean", "Must be boolean")
        }
    }

    generate(): boolean {
        return false
    }
}
