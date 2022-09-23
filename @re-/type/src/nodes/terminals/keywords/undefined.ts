import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class UndefinedNode extends TerminalNode {
    check(args: Check.CheckArgs) {
        if (args.data !== undefined) {
            addTypeKeywordDiagnostic(args, "undefined", "Must be undefined")
        }
    }

    generate(): undefined {
        return undefined
    }
}
