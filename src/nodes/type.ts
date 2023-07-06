import { NodeBase } from "./node.js"

export class TypeNode extends NodeBase<[], {}> {
    readonly kind = "type"

    constructor(input: [], meta: {}) {
        super(input, meta)
    }

    compile() {
        return ""
    }

    describe() {
        return ""
    }
}
