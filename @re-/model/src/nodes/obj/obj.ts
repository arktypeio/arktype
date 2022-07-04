import { Evaluate, Iteration, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Root } from "../root.js"
import { Base } from "./base.js"
import { Record } from "./record.js"
import { Regex } from "./regex.js"
import { Tuple } from "./tuple.js"

export namespace Obj {
    // Objects of these types are inherently valid and should not be checked via "Obj.Validate"
    export type Unmapped = Regex.Definition

    export type Validate<Def extends object, Dict> = {
        [K in keyof Def]: Root.Validate<Def[K], Dict>
    }

    export type Parse<Def extends object, Dict, Seen> = Def extends RegExp
        ? string
        : Def extends unknown[] | readonly unknown[]
        ? Evaluate<{
              -readonly [I in keyof Def]: Root.Parse<Def[I], Dict, Seen>
          }>
        : Record.Parse<Def, Dict, Seen>

    export type References<
        Def extends object,
        PreserveStructure extends boolean
    > = Def extends Regex.Definition
        ? [`/${Def["source"]}/`]
        : PreserveStructure extends true
        ? StructuredReferences<Def>
        : UnstructuredReferences<ListPossibleTypes<ValueOf<Def>>, []>

    type UnstructuredReferences<
        Values extends unknown[],
        Result extends unknown[]
    > = Values extends Iteration<unknown, infer Current, infer Remaining>
        ? UnstructuredReferences<
              Remaining,
              [...Result, ...Root.References<Current, false>]
          >
        : Result

    type StructuredReferences<Def extends object> = Evaluate<{
        -readonly [K in keyof Def]: Root.References<Def[K], true>
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
        return new Record.Node(def as Record.Definition, ctx)
    }
}
