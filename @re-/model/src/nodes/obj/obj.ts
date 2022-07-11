import { Evaluate, Iteration, ListPossibleTypes, ValueOf } from "@re-/tools"
import { Root } from "../root.js"
import { Base } from "./base.js"
import { Record } from "./record.js"
import { Regex } from "./regex.js"
import { Tuple } from "./tuple.js"

export namespace Obj {
    // Objects of these types are inherently valid and should not be checked via "Obj.Validate"
    export type Unmapped = Regex.Definition

    export type Parse<Def, Dict> = Def extends RegExp
        ? Base.Parsing.Types.Terminal<Def, string>
        : Def extends unknown[] | readonly unknown[]
        ? {
              -readonly [I in keyof Def]: Root.Parse<Def[I], Dict>
          }
        : { -readonly [K in keyof Def]: Root.Parse<Def[K], Dict> }

    export type Validate<Tree> = Evaluate<{
        [K in keyof Tree]: Root.Validate<Tree[K]>
    }>

    export type TypeOf<Tree> = Tree extends unknown[] | readonly unknown[]
        ? Evaluate<{
              [I in keyof Tree]: Root.TypeOf<Tree[I]>
          }>
        : Record.TypeOf<Tree>

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
