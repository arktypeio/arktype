import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class VoidNode extends TerminalNode {
    check(args: Check.CheckArgs) {
        if (args.data !== undefined) {
            addTypeKeywordDiagnostic(args, "void", "Must be undefined")
        }
    }

    generate(): void {}
}
