import type { Base } from "../../base/base.js"
import type { Arr } from "./array.js"
import type { Optional } from "./optional.js"

export namespace Postfix {
    export const tokens = {
        "[]": 1,
        "?": 1
    }

    export type Token = keyof typeof tokens

    export abstract class Node implements Base.Node {
        abstract child: Base.Node
        abstract kind: KindName
        abstract traverse(traversal: Base.Traversal): void
        abstract description: string
        abstract toString(): string

        get children() {
            return [this.child]
        }

        get definitionRequiresStructure() {
            return this.child.definitionRequiresStructure
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

    export type Kinds = {
        array: Arr.Node
        optional: Optional.Node
    }

    export type KindName = keyof Kinds
}
