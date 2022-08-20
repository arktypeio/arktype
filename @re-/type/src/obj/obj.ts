import { Evaluate, IterateType, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Node } from "../common.js"
import { Root } from "../root.js"
import { Record, RecordNode } from "./record.js"
import { TupleNode } from "./tuple.js"

export type Validate<Def, Dict> = {
    [K in keyof Def]: Root.Validate<Def[K], Dict>
}

export type Infer<Def, Ctx extends Node.InferenceContext> = Def extends
    | unknown[]
    | readonly unknown[]
    ? Evaluate<{
          -readonly [I in keyof Def]: Root.Infer<Def[I], Ctx>
      }>
    : Record.Infer<Def, Ctx>

export type References<
    Def extends object,
    Dict,
    PreserveStructure extends boolean
> = PreserveStructure extends true
    ? StructuredReferences<Def, Dict>
    : UnstructuredReferences<ListPossibleTypes<ValueOf<Def>>, [], Dict>

type UnstructuredReferences<
    Values extends unknown[],
    Result extends unknown[],
    Dict
> = Values extends IterateType<unknown, infer Current, infer Remaining>
    ? UnstructuredReferences<
          Remaining,
          [...Result, ...Root.References<Current, Dict, false>],
          Dict
      >
    : Result

type StructuredReferences<Def extends object, Dict> = Evaluate<{
    -readonly [K in keyof Def]: Root.References<Def[K], Dict, true>
}>

export const parse: Node.ParseFn<object> = (def, ctx) => {
    if (TupleNode.matches(def)) {
        return new TupleNode(def, ctx)
    }
    return new RecordNode(def as Record.Definition, ctx)
}
