import { chainableNoOpProxy, keySet, toString } from "@re-/tools"
import type { DynamicArktype } from "../type.js"
import { Check } from "./traverse/check.js"

export namespace Base {
    export abstract class Node implements DynamicArktype {
        abstract children?: Node[]
        abstract definitionHasStructure: boolean
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

        abstract allows(
            data: InferPrecondition<this["precondition"]>
        ): AllowsResult

        readonly precondition?: Node

        abstract toString(): string
        abstract readonly mustBe: string

        /**
        abstract get ast(): unknown
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

    export type AllowsResult = boolean | Node

    export type InferPrecondition<node extends Node | undefined> =
        node extends {}
            ? node["allows"] extends (
                  data: unknown
              ) => data is infer Postcondition
                ? Postcondition
                : node["allows"] extends (
                      data: infer PreviousPrecondition
                  ) => unknown
                ? PreviousPrecondition
                : never
            : unknown
}

export const pathToString = (path: string[]) =>
    path.length === 0 ? "/" : path.join("/")

const vowels = keySet({ a: 1, e: 1, i: 1, o: 1, u: 1 })

// TODO: Remove
export const addArticle = (phrase: string) =>
    (phrase[0] in vowels ? "an " : "a ") + phrase

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })
