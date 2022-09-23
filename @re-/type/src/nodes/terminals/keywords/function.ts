import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class FunctionNode extends TerminalNode {
    check(args: Check.CheckArgs) {
        if (typeof args.data !== "function") {
            addTypeKeywordDiagnostic(args, "function", "Must be a function")
        }
    }

    generate(): Function {
        return Function()
    }
}
