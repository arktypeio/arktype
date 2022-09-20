import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { KeywordDiagnostic } from "./common.js"

export class BigintNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "bigint") {
            args.diagnostics.push(new KeywordDiagnostic("bigint", args))
        }
    }

    generate(): bigint {
        return 0n
    }
}
