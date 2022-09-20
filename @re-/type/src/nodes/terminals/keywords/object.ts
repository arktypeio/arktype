import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class ObjectNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "object" || args.data === null) {
            args.diagnostics.push(new KeywordDiagnostic("object", args))
        }
    }

    generate(): object {
        return {}
    }
}
