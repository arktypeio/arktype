import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class VoidNode extends TerminalNode {
    check(args: Allows.Args) {
        if (args.data !== undefined) {
            addTypeKeywordDiagnostic(args, "void", "Must be undefined")
        }
    }

    generate(): void {}
}
