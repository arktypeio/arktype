import { TerminalNode } from "../terminal.js"

export class UnknownNode extends TerminalNode<"unknown"> {
    constructor() {
        super("unknown")
    }

    // Allows all data
    check() {}

    generate(): unknown {
        return undefined
    }
}
