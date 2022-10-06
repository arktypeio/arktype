import type { Dictionary, NormalizedJsTypeName } from "@re-/tools"
import { jsTypeOf, toString } from "@re-/tools"
import type { Check } from "./traverse/check.js"

export namespace Base {
    export type Node = {
        hasStructure: boolean
        check(state: Check.State): void
        toAst(): unknown
        toString(): string

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
        toDefinition(): unknown
    }
}

export namespace Structure {
    export type Kind = "object" | "array"

    export const checkKind = <ExpectedStructure extends Structure.Kind>(
        node: Base.Node,
        expectedStructure: ExpectedStructure,
        state: Check.State
    ): state is Check.State<
        ExpectedStructure extends "array" ? unknown[] : Dictionary
    > => {
        const actual = jsTypeOf(state.data)
        if (expectedStructure !== actual) {
            const expectedStructureDescription =
                expectedStructure === "array"
                    ? "an array"
                    : "a non-array object"
            state.addError("structure", {
                type: node,
                message: `Must be ${expectedStructureDescription}`,
                expected: expectedStructure,
                actual
            })
            return false
        }
        return true
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Base.Node,
        {
            expected: Kind
            actual: NormalizedJsTypeName
        }
    >
}

export namespace Constrainable {
    export type Data = number | string | readonly unknown[]

    export type Kind = "number" | "string" | "array"

    export const toNumber = (data: Data) =>
        typeof data === "number" ? data : data.length

    export const toKind = (data: Data) =>
        typeof data === "number"
            ? "number"
            : typeof data === "string"
            ? "string"
            : "array"
}

export type Segment = string | number
export type Path = Segment[]

export const pathToString = (path: Path) =>
    path.length === 0 ? "/" : path.join("/")

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })
