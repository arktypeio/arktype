import { Evaluate, Iteration, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Root } from "../root.js"
import { Base } from "./base.js"
import { Map } from "./map.js"
import { Regex } from "./regex.js"
import { Tuple } from "./tuple.js"

export namespace Obj {
    // Objects of these types are inherently valid and should not be checked via "Obj.Validate"
    export type Leaves = RegExp

    export type Validate<Def extends object, Dict> = {
        [K in keyof Def]: Root.Validate<Def[K], Dict>
    }

    export type Parse<Def extends object, Dict, Seen> = Def extends RegExp
        ? string
        : Def extends unknown[] | readonly unknown[]
        ? Evaluate<{
              -readonly [I in keyof Def]: Root.Parse<Def[I], Dict, Seen>
          }>
        : Map.Parse<Def, Dict, Seen>

    export type References<
        Def extends object,
        Filter,
        PreserveStructure extends boolean,
        Format extends Base.References.TypeFormat
    > = PreserveStructure extends true
        ? StructuredReferences<Def, Filter, Format>
        : UnstructuredReferences<
              ListPossibleTypes<ValueOf<Def>>,
              [],
              Filter,
              Format
          >

    type UnstructuredReferences<
        Values extends unknown[],
        Result extends unknown[],
        Filter,
        Format extends Base.References.TypeFormat
    > = Values extends Iteration<unknown, infer Current, infer Remaining>
        ? UnstructuredReferences<
              Remaining,
              [...Result, ...Root.References<Current, Filter, false, Format>],
              Filter,
              Format
          >
        : Result

    type StructuredReferences<
        Def extends object,
        Filter,
        Format extends Base.References.TypeFormat
    > = Evaluate<{
        [K in keyof Def]: Root.References<Def[K], Filter, true, Format>
    }>

    export const matches = (def: unknown): def is object =>
        typeof def === "object" && def !== null

    export const parse: Base.Parsing.Parser<object> = (def, ctx) => {
        if (Regex.matches(def)) {
            return new Regex.Node(def, ctx)
        }
        if (Tuple.matches(def)) {
            return new Tuple.Node(def, ctx)
        }
        return new Map.Node(def as Map.Definition, ctx)
    }
}
