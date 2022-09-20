import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class BooleanNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "boolean") {
            args.diagnostics.push(new KeywordDiagnostic("boolean", args))
        }
    }

    generate(): boolean {
        return false
    }
}
