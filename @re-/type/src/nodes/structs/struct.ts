import { jsTypeOf, transform } from "@re-/tools"
import type {
    Dictionary,
    KeySet,
    NormalizedJsTypeName,
    UnionToTuple
} from "@re-/tools"
import { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { Check, References } from "../traverse/exports.js"

type StructKey = string | number

export type StructEntries<KeyType extends StructKey> = [KeyType, Base.node][]

export abstract class struct<KeyType extends StructKey> extends Base.node {
    constructor(public entries: StructEntries<KeyType>) {
        super()
    }

    toIsomorphicDef() {
        return transform(this.entries, ([, [k, child]]) => [
            k,
            child.toIsomorphicDef
        ])
    }

    toAst() {
        return transform(this.entries, ([, [k, child]]) => [k, child.toAst()])
    }

    toString() {
        const isArray = Array.isArray(this.toIsomorphicDef)
        const nestedIndentation = indentation + "    "
        const indentation = "    ".repeat(this.ctx.path.length)
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

export type ObjectKind = "object" | "array"

export const checkObjectRoot = <ExpectedStructure extends ObjectKind>(
    definition: string,
    expectedStructure: ExpectedStructure,
    state: Check.CheckState
): state is Check.CheckState<
    ExpectedStructure extends "array" ? unknown[] : Dictionary
> => {
    const actual = jsTypeOf(state.data)
    if (expectedStructure !== actual) {
        const expectedStructureDescription =
            expectedStructure === "array" ? "an array" : "a non-array object"
        state.errors.add(
            "structure",
            {
                reason: `Must be ${expectedStructureDescription}`,
                state
            },
            {
                definition,
                data: state.data,
                expected: expectedStructure,
                actual
            }
        )
        return false
    }
    return true
}

export type StructureDiagnostic = Check.DiagnosticConfig<{
    definition: string
    data: unknown
    expected: ObjectKind
    actual: NormalizedJsTypeName
}>

export namespace Struct {
    export type References<Ast> = CollectReferences<
        Ast extends readonly unknown[] ? Ast : UnionToTuple<Ast[keyof Ast]>,
        []
    >

    type CollectReferences<
        Children extends readonly unknown[],
        Result extends readonly unknown[]
    > = Children extends [infer Head, ...infer Tail]
        ? CollectReferences<Tail, [...Result, ...RootNode.References<Head>]>
        : Result
}
