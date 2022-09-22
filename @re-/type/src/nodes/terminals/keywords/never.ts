import type { Allows } from "../../allows.js"
import { Generate } from "../../generate.js"
import { TerminalNode } from "../terminal.js"

export class NeverNode extends TerminalNode {
    check(args: Allows.Args) {
        args.diagnostics.add("keyword", "never", args, {
            reason: "Is never allowed"
        })
    }

    generate(): never {
        throw new Generate.UngeneratableError(
            "never",
            "never is ungeneratable by definition."
        )
    }
}
