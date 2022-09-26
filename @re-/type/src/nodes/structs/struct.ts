import type {
    Dictionary,
    IsAnyOrUnknown,
    KeySet,
    ListPossibleTypes,
    ValueOf
} from "@re-/tools"
import { transform } from "@re-/tools"
import { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { Check, References } from "../traverse/exports.js"

type StructKey = string | number

export type StructConstructorArgs<KeyType extends StructKey> = [
    entries: [KeyType, Base.node][],
    context: Base.context
]

export abstract class struct<KeyType extends StructKey> extends Base.node<
    KeyType extends number ? unknown[] : Record<string, unknown>
> {
    entries: [KeyType, Base.node][]

    constructor(...[entries, context]: StructConstructorArgs<KeyType>) {
        const definition = transform(entries, ([, [k, child]]) => [
            k,
            child.definition
        ])
        const ast = transform(entries, ([, [k, child]]) => [k, child.ast])
        super(definition, ast, context)
        this.entries = entries
    }

    toString() {
        const isArray = Array.isArray(this.definition)
        const indentation = "    ".repeat(this.context.path.length)
        const nestedIndentation = indentation + "    "
        let result = isArray ? "[" : "{"
        for (let i = 0; i < this.entries.length; i++) {
            result += "\n" + nestedIndentation
            if (!isArray) {
                result += this.entries[i][0] + ": "
            }
            result += this.entries[i][1].toString()
            if (i !== this.entries.length - 1) {
                result += ","
            } else {
                result += "\n"
            }
        }
        return result + indentation + (isArray ? "]" : "}")
    }

    collectReferences(opts: References.ReferencesOptions, collected: KeySet) {
        for (const entry of this.entries) {
            entry[1].collectReferences(opts, collected)
        }
    }
}

export type ObjectKind = "array" | "dictionary"

export type StructureOfResult = ObjectKind | "non-object"

export type StrucutureOf<Data> = IsAnyOrUnknown<Data> extends true
    ? StructureOfResult
    : Data extends object
    ? Data extends readonly unknown[]
        ? "array"
        : "dictionary"
    : "non-object"

export const structureOf = <Data>(data: Data) =>
    (typeof data !== "object" || data === null
        ? "non-object"
        : Array.isArray(data)
        ? "array"
        : "dictionary") as StrucutureOf<Data>

export const checkObjectRoot = <ExpectedStructure extends ObjectKind>(
    definition: Base.RootDefinition,
    expectedStructure: ExpectedStructure,
    state: Check.CheckState
): state is Check.CheckState<
    ExpectedStructure extends "array" ? unknown[] : Dictionary
> => {
    const actualStructure = structureOf(state.data)
    if (expectedStructure !== actualStructure) {
        const expectedStructureDescription =
            expectedStructure === "array" ? "an array" : "a non-array object"
        state.errors.add(
            "structure",
            {
                reason: `Must be ${expectedStructureDescription}`,
                state: state
            },
            {
                definition,
                data: state.data,
                expected: expectedStructure,
                actual: actualStructure
            }
        )
        return false
    }
    return true
}

export type StructureDiagnostic = Check.DiagnosticConfig<{
    definition: Base.RootDefinition
    data: unknown
    expected: ObjectKind
    actual: StructureOfResult
}>

export namespace Struct {
    export type References<Ast> = CollectReferences<
        Ast extends readonly unknown[] ? Ast : ListPossibleTypes<ValueOf<Ast>>,
        []
    >

    type CollectReferences<
        Children extends readonly unknown[],
        Result extends readonly unknown[]
    > = Children extends [infer Head, ...infer Tail]
        ? CollectReferences<Tail, [...Result, ...RootNode.References<Head>]>
        : Result
}
