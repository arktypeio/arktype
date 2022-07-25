import { Evaluate, Iteration, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Base } from "../base/index.js"
import { Root } from "../root.js"
import { RecordNode, RecordType } from "./record.js"
import { Regex } from "./regex.js"
import { TupleNode } from "./tuple.js"

export namespace Obj {
    // Objects of these types are inherently valid and should not be checked via "Obj.Validate"
    export type Unmapped = Regex.Definition

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
    > = Def extends Regex.Definition
        ? [`/${Def["source"]}/`]
        : PreserveStructure extends true
        ? StructuredReferences<Def, Dict>
        : UnstructuredReferences<ListPossibleTypes<ValueOf<Def>>, [], Dict>

    type UnstructuredReferences<
        Values extends unknown[],
        Result extends unknown[],
        Dict
    > = Values extends Iteration<unknown, infer Current, infer Remaining>
        ? UnstructuredReferences<
              Remaining,
              [...Result, ...Root.References<Current, Dict, false>],
              Dict
          >
        : Result

    type StructuredReferences<Def extends object, Dict> = Evaluate<{
        -readonly [K in keyof Def]: Root.References<Def[K], Dict, true>
    }>

    export const matches = (def: unknown): def is object =>
        typeof def === "object" && def !== null

    export const parse: Base.Parsing.ParseFn<object> = (def, ctx) => {
        if (Regex.matches(def)) {
            return new Regex.Node(def)
        }
        if (TupleNode.matches(def)) {
            return new TupleNode(def, ctx)
        }
        return new RecordNode(def as RecordType.Definition, ctx)
    }
}
