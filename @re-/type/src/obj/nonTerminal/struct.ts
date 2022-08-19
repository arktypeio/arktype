import { Evaluate, IterateType, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Root } from "../../../root.js"
import { Base } from "../../base/index.js"
import { RecordNode, RecordType } from "./record.js"
import { TupleNode } from "./tuple.js"

export namespace Struct {
    export type Validate<Def, Dict> = {
        [K in keyof Def]: Root.Validate<Def[K], Dict>
    }

    export type Infer<
        Def,
        Ctx extends Base.Parsing.InferenceContext
    > = Def extends unknown[] | readonly unknown[]
        ? Evaluate<{
              -readonly [I in keyof Def]: Root.Infer<Def[I], Ctx>
          }>
        : RecordType.Infer<Def, Ctx>

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

    export const parse: Base.Parsing.ParseFn<object> = (def, ctx) => {
        if (TupleNode.matches(def)) {
            return new TupleNode(def, ctx)
        }
        return new RecordNode(def as RecordType.Definition, ctx)
    }
}
