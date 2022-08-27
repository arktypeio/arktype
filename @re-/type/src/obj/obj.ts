import { Evaluate, IterateType, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Root } from "../root.js"
import { Node } from "./common.js"
import { Record, RecordNode } from "./record.js"
import { TupleNode } from "./tuple.js"

export type Validate<Def, Dict> = {
    [K in keyof Def]: Root.Validate<Def[K], Dict>
}

type Tuple = { "[]": readonly unknown[] }

export type Parse<Def, Dict> = Def extends readonly unknown[]
    ? { "[]": ParseChildren<Def, Dict> }
    : ParseChildren<Def, Dict>

type ParseChildren<Def, Dict> = Evaluate<{
    [K in keyof Def]: Root.Parse<Def[K], Dict>
}>

export type Infer<Tree, Ctx extends Node.InferenceContext> = Tree extends Tuple
    ? InferTuple<Tree["[]"], Ctx>
    : Record.Infer<Tree, Ctx>

export type InferTuple<
    Tree extends readonly unknown[],
    Ctx extends Node.InferenceContext
> = Evaluate<{
    [I in keyof Tree]: Root.Infer<Tree[I], Ctx>
}>

export type References<
    Tree,
    PreserveStructure extends boolean
> = PreserveStructure extends true
    ? StructuredReferences<Tree extends Tuple ? Tree["[]"] : Tree>
    : UnstructuredReferences<ListPossibleTypes<ValueOf<Tree>>, []>

type UnstructuredReferences<
    Values extends unknown[],
    Result extends unknown[]
> = Values extends IterateType<unknown, infer Current, infer Remaining>
    ? UnstructuredReferences<
          Remaining,
          [...Result, ...Root.References<Current, false>]
      >
    : Result

type StructuredReferences<Tree> = Evaluate<{
    [K in keyof Tree]: Root.References<Tree[K], true>
}>

export const parse: Node.parseFn<object> = (def, ctx) => {
    if (TupleNode.matches(def)) {
        return new TupleNode(def, ctx)
    }
    return new RecordNode(def as Record.Definition, ctx)
}
