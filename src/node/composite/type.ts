import { BaseNode } from "../base.js"

export class TypeNode extends BaseNode {
    constructor(input: readonly object[], meta: {}) {
        super("type", input, meta)
    }
}
