import { Base } from "../base.js"
import { Bound } from "./bound.js"
import type { Branching } from "./branching/branching.js"
import type { Divisibility } from "./divisibility.js"

export namespace Expression {
    export const tokensToKinds = {
        "?": "optional",
        "[]": "array",
        "|": "union",
        "&": "intersection",
        "%": "divisibility",
        ...Bound.tokensToKinds
    } as const

    export type TokensToKinds = typeof tokensToKinds

    export type Token = PostfixToken | BinaryToken

    export type PostfixToken = "[]" | "?"

    export type BinaryToken = ConstraintToken | Branching.Token

    export type ConstraintToken = Bound.Token | Divisibility.Token

    export type Tuple = readonly [left: unknown, token: Token, right?: unknown]

    type MappedChildren<Children extends Base.UnknownNode[]> = {
        [I in keyof Children]: unknown
    }

    // TODO: Can remove?
    export type LeftTypedAst = Bound.RightAst | Divisibility.Tuple

    export type RightTypedAst = Bound.LeftAst

    export abstract class Node<
        Children extends Base.UnknownNode[],
        Tuple extends Expression.Tuple
    > extends Base.Node<TokensToKinds[Tuple[1]], Children> {
        abstract toTuple(
            ...childResults: MappedChildren<Children>
        ): Readonly<Tuple>

        hasStructure: boolean

        constructor(public children: Children) {
            super()
            this.hasStructure = children.some(childHasStructure)
        }

        get ast() {
            return this.toTuple(
                ...(this.children.map(
                    (child) => child.ast
                ) as MappedChildren<Children>)
            )
        }

        get definition() {
            return this.hasStructure
                ? this.toTuple(
                      ...(this.children.map(
                          (child) => child.definition
                      ) as MappedChildren<Children>)
                  )
                : this.toString()
        }
    }

    const childHasStructure = (child: Base.UnknownNode) => child.hasStructure
}
