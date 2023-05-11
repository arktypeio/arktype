import { type constructor, prototypeKeysOf } from "../../utils/objectKinds.js"
import type { CompilationState } from "../compilation.js"
import { In } from "../compilation.js"
import { registry } from "../registry.js"
import { BasisNode } from "./basis.js"

export class ClassNode extends BasisNode {
    readonly domain = "object"

    constructor(public instanceOf: constructor) {
        super("class", ClassNode.compile(instanceOf))
    }

    static compile(instanceOf: constructor) {
        return `${In} instanceof ${
            instanceOf === Array
                ? "Array"
                : registry().register(instanceOf.name, instanceOf)
        }`
    }

    toString() {
        return this.instanceOf.name
    }

    getConstructor() {
        return this.instanceOf
    }

    literalKeysOf() {
        return prototypeKeysOf(this.instanceOf)
    }

    compileTraverse(s: CompilationState) {
        return s.ifNotThen(this.condition, s.problem("class", this.instanceOf))
    }
}
