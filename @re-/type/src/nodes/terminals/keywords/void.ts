import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class VoidNode extends TerminalNode {
    check(args: Allows.Args) {
        if (args.data !== undefined) {
            args.diagnostics.push(new KeywordDiagnostic("void", args))
        }
    }

    generate(): void {}
}
