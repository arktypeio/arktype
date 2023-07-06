import { NodeBase } from "../base.js"

export class PropertiesNode extends NodeBase<[], {}> {
    readonly kind = "properties"

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
