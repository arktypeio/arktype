import type { NormalizedJsTypeName } from "@re-/tools"
import { toString } from "@re-/tools"
import type { Arr } from "../../nonTerminal/array.js"
import type { ObjectLiteral } from "../../structural/objectLiteral.js"
import type { Tuple } from "../../structural/tuple.js"
import type { Check } from "./check.js"

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })

export namespace Structure {
    export type Kind = "object" | "array"

    export type Node = ObjectLiteral.Node | Tuple.Node | Arr.Node

    export type Diagnostic = Check.ConfigureDiagnostic<
        Node,
        {
            expected: Kind
            actual: NormalizedJsTypeName
        }
    >
}

export namespace Constraint {
    export type Data = number | string | unknown[]

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
