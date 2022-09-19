import type { Str } from "../parser/str/str.js"
import type { Base } from "./base.js"
import type { Obj } from "./nonTerminal/obj/index.js"

export type RootInfer<
    Def,
    Ctx extends Base.InferenceContext
> = unknown extends Def
    ? Def
    : Def extends string
    ? Str.Infer<Def, Ctx>
    : Obj.Infer<Def, Ctx>

export type RootReferences<
    Def,
    Dict,
    PreserveStructure extends boolean
> = Def extends string
    ? Str.References<Def, Dict>
    : Obj.References<Def, Dict, PreserveStructure>
