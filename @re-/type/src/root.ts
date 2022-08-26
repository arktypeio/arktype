import { Node } from "./node/index.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/str.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends string
        ? Str.Validate<Def, Dict>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage
        : Obj.Validate<Def, Dict>

    export type StrRoot<Node> = { $str: Node }

    export type Parse<Def, Dict> = Def extends string
        ? StrRoot<Str.Parse<Def, Dict>>
        : Obj.Parse<Def, Dict>

    export type Infer<
        Tree,
        Ctx extends Node.InferenceContext
    > = unknown extends Tree
        ? Tree
        : Tree extends StrRoot<infer Root>
        ? Str.Infer<Root, Ctx>
        : Obj.Infer<Tree, Ctx>

    export type References<
        Tree,
        PreserveStructure extends boolean
    > = Tree extends StrRoot<infer Root>
        ? Str.References<Root>
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

    export const parse: Node.parseFn<unknown> = (def, ctx) => {
        if (typeof def === "string") {
            return Str.parse(def, ctx)
        }
        if (typeof def === "object" && def !== null) {
            return Obj.parse(def, ctx)
        }
        throw new Node.parseError(
            BAD_DEF_TYPE_MESSAGE + ` (got ${typeof def}).`
        )
    }
}
