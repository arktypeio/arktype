import { Evaluate, IterateType, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Root } from "../root.js"
import { Node } from "./common.js"
import { Record, RecordNode } from "./record.js"
import { TupleNode } from "./tuple.js"

export type Validate<Def, Dict> = {
    [K in keyof Def]: Root.Validate<Def[K], Dict>
}

export type Parse<Def, Dict> = Evaluate<{
    [K in keyof Def]: Root.Parse<Def[K], Dict>
}>

export type Infer<
    Def,
    Ctx extends Node.InferenceContext
> = Def extends readonly unknown[]
    ? InferTuple<Def, Ctx>
    : Record.Infer<Def, Ctx>

export type InferTuple<
    Def extends readonly unknown[],
    Ctx extends Node.InferenceContext
> = Evaluate<{
    [I in keyof Def]: Root.Infer<Def[I], Ctx>
}>

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
          [...Result, ...Root.References<Current, Dict, false>]
      >
    : Result

type StructuredReferences<Def, Dict> = Evaluate<{
    [K in keyof Def]: Root.References<Def[K], Dict, true>
}>

export const parse: Node.parseFn<object> = (def, ctx) => {
    if (TupleNode.matches(def)) {
        return new TupleNode(def, ctx)
    }
    return new RecordNode(def as Record.Definition, ctx)
}
