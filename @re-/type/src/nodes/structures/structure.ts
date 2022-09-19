import type {
    Evaluate,
    IterateType,
    ListPossibleTypes,
    ValueOf
} from "@re-/tools"
import type { Root } from "../../parser/root.js"
import type { Base } from "../base.js"
import type { RootReferences } from "../root.js"
import type { Dictionary } from "./dictionary.js"
import type { InferTuple } from "./tuple.js"

export namespace Structure {
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
