import { Base } from "../base/base.js"
import type { Tokens } from "../tokens.js"

export namespace Unary {
    export abstract class Node extends Base.Node {
        abstract child: Base.Node

        get definitionRequiresStructure() {
            return this.child.definitionRequiresStructure
        }

        abstract tupleWrap(
            next: unknown
        ): readonly [left: unknown, token: Tokens, right?: unknown]

        get ast() {
            return this.tupleWrap(this.child.ast) as ReturnType<
                this["tupleWrap"]
            >
        }

        get definition(): ReturnType<this["toString" | "tupleWrap"]> {
            return this.definitionRequiresStructure
                ? this.tupleWrap(this.child.definition)
                : (this.toString() as any)
        }
    }
}
