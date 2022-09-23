import type { Check } from "../../traverse/exports.js"
import { TerminalNode } from "../terminal.js"
import { addTypeKeywordDiagnostic } from "./common.js"

export class BigintNode extends TerminalNode {
    check(args: Check.CheckArgs) {
        if (typeof args.data !== "bigint") {
            addTypeKeywordDiagnostic(args, "bigint", "Must be a bigint")
        }
    }

    generate(): bigint {
        return 0n
    }
}
