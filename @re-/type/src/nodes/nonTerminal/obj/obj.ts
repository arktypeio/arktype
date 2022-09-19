import type {
    Evaluate,
    IterateType,
    ListPossibleTypes,
    ValueOf
} from "@re-/tools"
import type { parseFn } from "../../../parser/common.js"
import type { Root } from "../../../parser/root.js"
import type { Base } from "../../base.js"
import type { Dictionary } from "./dictionary.js"
import { DictionaryNode } from "./dictionary.js"
import type { InferTuple } from "./tuple.js"
import { TupleNode } from "./tuple.js"

export namespace Obj {
    export type Validate<Def, Dict> = {
        [K in keyof Def]: Root.Validate<Def[K], Dict>
    }

    export type Parse<Def, Dict> = Evaluate<{
        [K in keyof Def]: Root.Parse<Def[K], Dict>
    }>

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
              [...Result, ...Root.References<Current, Dict, false>]
          >
        : Result

    type StructuredReferences<Def, Dict> = Evaluate<{
        [K in keyof Def]: Root.References<Def[K], Dict, true>
    }>

    export const parse: parseFn<object> = (def, ctx) => {
        if (Array.isArray(def)) {
            return new TupleNode(def, ctx)
        }
        return new DictionaryNode(def as Dictionary.Definition, ctx)
    }
}
