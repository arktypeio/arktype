import type { Base } from "../../base/base.js"
import type { Bound } from "./bound.js"
import type { Divisibility } from "./divisibility.js"
import type { Scope } from "./scope.js"

export namespace Infix {
    export const comparators = {
        "<": "bound",
        ">": "bound",
        "<=": "bound",
        ">=": "bound",
        "==": "bound"
    } as const

    export type Comparator = keyof typeof comparators

    export const tokens = {
        "%": "divisibility",
        $: "scope",
        ...comparators
    } as const

    export type Token = keyof typeof tokens

    export abstract class Node implements Base.Node {
        abstract child: Base.Node
        abstract kind: KindName
        abstract traverse(traversal: Base.Traversal): void
        abstract description: string
        abstract toString(): string

        get children() {
            return [this.child] as [this["child"]]
        }

        get definitionRequiresStructure() {
            return this.child.definitionRequiresStructure
        }

        abstract tupleWrap(
            next: unknown
        ): readonly [left: unknown, token: Token, right: unknown]

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

    export type Kinds = {
        leftBound: Bound.LeftNode
        rightBound: Bound.RightNode
        divisibility: Divisibility.Node
        scope: Scope.Node
    }

    export type KindName = keyof Kinds
}
