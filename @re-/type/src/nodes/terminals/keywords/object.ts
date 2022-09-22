import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class ObjectNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "object" || args.data === null) {
            addTypeKeywordDiagnostic(args, "object", "Must be an object")
        }
    }

    generate(): object {
        return {}
    }
}
