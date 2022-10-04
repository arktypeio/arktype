import { Terminal } from "../../terminal.js"

export class AnyNode extends Terminal.Node<"any"> {
    constructor() {
        super("any")
    }

    // Allows all data
    check() {}
}
