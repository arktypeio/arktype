import { chainableNoOpProxy, keySet } from "@re-/tools"
import type { DynamicArktype } from "../type.js"
import { Check } from "./traverse/check.js"

export namespace Base {
    export abstract class Node implements DynamicArktype {
        abstract children?: Node[]
        abstract hasStructure: boolean
        abstract readonly kind: string

        check(data: unknown) {
            const state = new Check.State(data)
            this.allows(state)
            return state.errors.length
                ? {
                      errors: state.errors
                  }
                : { data }
        }

        assert(data: unknown) {
            const result = this.check(data)
            result.errors?.throw()
            return result.data
        }

        get infer() {
            return chainableNoOpProxy
        }

        abstract allows: AllowsFn<this>

        precondition?: Node

        abstract toString(): string
        abstract get mustBe(): string
        abstract get ast(): unknown
        /**
         * This generates an isomorphic definition that can be parsed and
         * inverted. The preferred isomorphic format for expressions is the
         * string form over the tuple form:
         *
         * Terminal => string
         * Structural => object
         * NonTerminal => Any structural descendants ? [tuple-form expression] : "string-form expression"
         *
         * For example, the input definitions...
         *
         *     "string|number" (string form)
         *         and
         *     ["string", "|", "number"] (tuple form)
         *
         * both result in a toDefinition() output of "string|number".
         *
         * However, if the input definition was:
         *
         *     [{ a: ["string", "?"] }, "&", { b: ["boolean", "?"] }]
         *
         * Since the structural (in this case object literal) definitions cannot
         * be stringified as a defininition, toDefintion() would yield:
         *
         *     [{a: "string?"}, "&", {b: "boolean?"}]
         */
        abstract definition: unknown
    }

    export type AllowsFn<node extends Node> =
        | BaseAllowsFn<InferPrecondition<node>>
        | NarrowingAllowsFn<InferPrecondition<node>>

    type BaseAllowsFn<precondition> = (
        data: precondition
    ) => boolean | undefined

    type NarrowingAllowsFn<precondition> = (
        data: precondition
    ) => data is precondition

    type InferPrecondition<node extends Node> = node["precondition"] extends {}
        ? node["precondition"]["allows"] extends (
              data: any
          ) => data is infer Postcondition
            ? Postcondition
            : InferPrecondition<node["precondition"]>
        : unknown
}

export const pathToString = (path: string[]) =>
    path.length === 0 ? "/" : path.join("/")

const vowels = keySet({ a: 1, e: 1, i: 1, o: 1, u: 1 })

export const addArticle = (phrase: string) =>
    (phrase[0] in vowels ? "an " : "a ") + phrase
