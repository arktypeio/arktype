import { Base } from "../base.js"
import type { Traversal } from "../traversal/traversal.js"
import { Bound } from "./bound.js"

export namespace Unary {
    export const tokensToKinds = {
        "?": "optional",
        "[]": "array",
        "%": "divisibility",
        ...Bound.tokensToKinds
    } as const

    export type Token = keyof typeof tokensToKinds

    export abstract class Node extends Base.Node {
        abstract child: Base.Node

        get definitionRequiresStructure() {
            return this.child.definitionRequiresStructure
        }

        next(state: Traversal) {
            this.child.traverse(state)
        }

        abstract tupleWrap(
            next: unknown
        ): readonly [left: unknown, token: Token, right?: unknown]

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
