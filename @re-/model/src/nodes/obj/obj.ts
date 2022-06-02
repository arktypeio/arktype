import { Root } from "../root.js"
import { Map } from "./map.js"

export namespace Obj {
    export type Parse<Def extends object, Dict, Seen> = Def extends
        | unknown[]
        | readonly unknown[]
        ? { -readonly [I in keyof Def]: Root.Parse<Def[I], Dict, Seen> }
        : Map.Parse<Def, Dict, Seen>
}
