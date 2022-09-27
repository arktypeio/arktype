import { TerminalNode } from "../terminal.js"

export class UnknownNode extends TerminalNode {
    // Allows all data
    typecheck() {}

    generate(): unknown {
        return undefined
    }
}
