import type {
    Evaluate,
    IterateType,
    ListPossibleTypes,
    ValueOf
} from "@re-/tools"
import { mapValues } from "@re-/tools"
import { Allows } from "../allows.js"
import { Base } from "../base.js"
import type { References } from "../references.js"
import type { RootReferences } from "../root.js"
import { KeywordDiagnostic } from "../terminals/keywords/common.js"
import type { Dictionary } from "./dictionary.js"
import type { InferTuple } from "./tuple.js"

export type ChildEntry<KeyType> = [KeyType, Base.node]

export type StructConstructorArgs<KeyType extends string | number> = [
    nodes: Record<KeyType, Base.node>,
    context: Base.context
]

const nodeToDefinition = (node: Base.node) => node.definition
const nodeToAst = (node: Base.node) => node.ast

export abstract class struct<
    KeyType extends string | number
> extends Base.node {
    entries: ChildEntry<KeyType>[]

    constructor(...[nodes, context]: StructConstructorArgs<KeyType>) {
        const definition = mapValues(nodes, nodeToDefinition)
        const ast = mapValues(nodes, nodeToAst)
        super(definition, ast, context)
        this.entries = Object.entries(nodes) as ChildEntry<KeyType>[]
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

export type ObjectKind = "array" | "dictionary"

export const checkObjectRoot = <Kind extends ObjectKind>(
    args: Allows.Args,
    kind: Kind
): args is Allows.Args<
    Kind extends "array" ? unknown[] : Record<string, unknown>
> => {
    if (typeof args.data !== "object" || args.data === null) {
        args.diagnostics.push(new KeywordDiagnostic("object", args))
        return false
    }
    if ((kind === "array") !== Array.isArray(args.data)) {
        args.diagnostics.push(new ObjectKindDiagnostic(kind, args))
        return false
    }
    return true
}

export class ObjectKindDiagnostic extends Allows.Diagnostic<"ObjectKind"> {
    public message: string

    constructor(public type: ObjectKind, args: Allows.Args) {
        super("ObjectKind", args)
        this.message = `Must ${type === "dictionary" ? "not " : ""}be an array.`
    }
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
