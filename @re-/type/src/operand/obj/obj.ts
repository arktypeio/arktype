import { Evaluate, IterateType, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Root } from "../../root.js"
import { Node, Parser } from "./common.js"
import { Record, RecordNode } from "./record.js"
import { TupleNode } from "./tuple.js"

export type Validate<Def, Dict> = {
    [K in keyof Def]: Root.Validate<Def[K], Dict>
}

export type Parse<Def, Dict> = Def extends readonly unknown[] | unknown[]
    ? {
          readonly [I in keyof Def]: Root.Parse<Def[I], Dict>
      }
    : {
          [K in keyof Def]: Root.Parse<Def[K], Dict>
      }

export type Infer<
    Tree,
    Ctx extends Node.InferenceContext
> = Tree extends readonly unknown[]
    ? Evaluate<{
          -readonly [I in keyof Tree]: Root.Infer<Tree[I], Ctx>
      }>
    : Record.Infer<Tree, Ctx>

export type References<
    Tree,
    PreserveStructure extends boolean
> = PreserveStructure extends true
    ? StructuredReferences<Tree>
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

export const parse: Parser.ParseFn<object> = (def, ctx) => {
    if (TupleNode.matches(def)) {
        return new TupleNode(def, ctx)
    }
    return new RecordNode(def as Record.Definition, ctx)
}
