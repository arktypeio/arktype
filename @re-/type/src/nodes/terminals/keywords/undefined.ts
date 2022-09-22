import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class UndefinedNode extends TerminalNode {
    check(args: Allows.Args) {
        if (args.data !== undefined) {
            addTypeKeywordDiagnostic(args, "undefined", "Must be undefined")
        }
    }

    generate(): undefined {
        return undefined
    }
}
