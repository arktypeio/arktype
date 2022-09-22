import type { Allows } from "../../allows.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class BigintNode extends TerminalNode {
    check(args: Allows.Args) {
        if (typeof args.data !== "bigint") {
            addTypeKeywordDiagnostic(args, "bigint", "Must be a bigint")
        }
    }

    generate(): bigint {
        return 0n
    }
}
