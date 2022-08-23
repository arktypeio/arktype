import { Node } from "./core.js"
import { Obj } from "./operand/obj/index.js"
import { Str } from "./str.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends string
        ? Str.Validate<Def, Dict>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage
        : Obj.Validate<Def, Dict>

    export type Parse<Def, Dict> = Def extends string
        ? Str.Parse<Def, Dict>
        : Obj.Parse<Def, Dict>

    export type Infer<
        Tree,
        Ctx extends Node.InferenceContext
    > = unknown extends Tree
        ? Tree
        : Tree extends string | unknown[]
        ? Str.Infer<Tree, Ctx>
        : Obj.Infer<Tree, Ctx>

    export type References<
        Tree,
        PreserveStructure extends boolean
    > = Tree extends string | unknown[]
        ? Str.References<Tree>
        : Obj.References<Tree, PreserveStructure>

    export type BadDefinitionType =
        | undefined
        | null
        | boolean
        | number
        | bigint
        | Function
        | symbol

    const BAD_DEF_TYPE_MESSAGE = "Type definitions must be strings or objects"

    type BadDefinitionTypeMessage = typeof BAD_DEF_TYPE_MESSAGE

    export const parse: Node.ParseFn<unknown> = (def, ctx) => {
        if (typeof def === "string") {
            return Str.parse(def, ctx)
        }
        if (typeof def === "object" && def !== null) {
            return Obj.parse(def, ctx)
        }
        throw new Node.ParseError(
            BAD_DEF_TYPE_MESSAGE + ` (got ${typeof def}).`
        )
    }
}
