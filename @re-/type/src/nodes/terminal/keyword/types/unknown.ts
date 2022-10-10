import { Terminal } from "../../terminal.js"

export class UnknownNode extends Terminal.Node<"unknown"> {
    constructor() {
        super("unknown")
    }

    // Allows all data
    allows() {}
}
