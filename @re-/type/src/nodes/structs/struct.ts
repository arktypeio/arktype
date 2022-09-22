import type {
    Evaluate,
    IterateType,
    ListPossibleTypes,
    ValueOf
} from "@re-/tools"
import { transform } from "@re-/tools"
import type { Allows } from "../allows.js"
import { Base } from "../base.js"
import type { References } from "../references.js"
import type { RootReferences } from "../root.js"
import type { Dictionary } from "./dictionary.js"
import type { InferTuple, TupleDefinition } from "./tuple.js"

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

    collectReferences(
        opts: References.Options<string, boolean>,
        collected: References.Collection
    ) {
        for (const entry of this.entries) {
            entry[1].collectReferences(opts, collected)
        }
    }

    override references(opts: References.Options) {
        if (opts.preserveStructure) {
            const references: References.StructuredReferences = {}
            for (const [k, childNode] of this.entries) {
                references[k] = childNode.references(opts)
            }
            return references
        }
        return super.references(opts)
    }
}

export type StructKind = "array" | "dictionary"

export const checkObjectRoot = <Definition>(
    definition: Definition,
    args: Allows.Args
): args is Allows.Args<
    Definition extends TupleDefinition ? unknown[] : Record<string, unknown>
> => {
    const expected: StructKind = Array.isArray(definition)
        ? "array"
        : "dictionary"
    if (typeof args.data !== "object" || args.data === null) {
        args.diagnostics.add("structure", definition, args, {
            reason: `Must be ${
                expected === "dictionary" ? "an object" : "an array"
            }`,
            kind: expected
        })
        return false
    }
    if ((expected === "array") !== Array.isArray(args.data)) {
        args.diagnostics.add("structure", {}, args, {
            reason: `Must ${
                expected === "dictionary" ? "not " : ""
            }be an array`,
            kind: expected
        })
        return false
    }
    return true
}

export namespace Struct {
    export type Infer<
        Def,
        Ctx extends Base.InferenceContext
    > = Def extends readonly unknown[]
        ? InferTuple<Def, Ctx>
        : Dictionary.Infer<Def, Ctx>

    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = PreserveStructure extends true
        ? StructuredReferences<Def, Dict>
        : UnstructuredReferences<ListPossibleTypes<ValueOf<Def>>, Dict, []>

    type UnstructuredReferences<
        Values extends unknown[],
        Dict,
        Result extends unknown[]
    > = Values extends IterateType<unknown, infer Current, infer Remaining>
        ? UnstructuredReferences<
              Remaining,
              Dict,
              [...Result, ...RootReferences<Current, Dict, false>]
          >
        : Result

    type StructuredReferences<Def, Dict> = Evaluate<{
        [K in keyof Def]: RootReferences<Def[K], Dict, true>
    }>
}
