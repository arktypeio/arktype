import { TerminalNode } from "../terminal.js"

export class UnknownNode extends TerminalNode {
    // Allows all data
    check() {}

    generate(): unknown {
        return undefined
    }
}
