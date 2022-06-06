import { Root } from "../root.js"
import { Map } from "./map.js"
import { Regex } from "./regex.js"
import { Tuple } from "./tuple.js"
import { Base } from "#base"

export namespace Obj {
    export type Validate<Def extends object, Dict> = Def extends RegExp
        ? string
        : { [K in keyof Def]: Root.Validate<Def, Dict> }

    export type Parse<Def extends object, Dict, Seen> = Def extends RegExp
        ? string
        : Def extends unknown[] | readonly unknown[]
        ? { -readonly [I in keyof Def]: Root.Parse<Def[I], Dict, Seen> }
        : Map.Parse<Def, Dict, Seen>

    export const Node: Base.Parser<object, unknown> = {
        matches: (def): def is object => !!def && typeof def === "object",
        parse: (def, ctx) => {
            if (Regex.Node.matches(def)) {
                return new Regex.Node(def, ctx)
            }
            if (Tuple.Node.matches(def)) {
                return new Tuple.Node(def, ctx)
            }
            return new Map.Node(def, ctx)
        }
    }
}
