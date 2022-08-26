import { Node } from "./node/index.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/str.js"

export namespace Root {
    export type Validate<Def, Dict> = Def extends string
        ? Str.Validate<Def, Dict>
        : Def extends BadDefinitionType
        ? BadDefinitionTypeMessage
        : Obj.Validate<Def, Dict>

    export type Parse<Def, Dict> = Def extends string
        ? Str.Root<Str.Parse<Def, Dict>>
        : Obj.Parse<Def, Dict>

    export type Infer<
        Tree,
        Ctx extends Node.InferenceContext
    > = Tree extends Str.Root<infer Node>
        ? Str.Infer<Node, Ctx>
        : Obj.Infer<Tree, Ctx>

    export type References<
        Tree,
        PreserveStructure extends boolean
    > = Tree extends Str.Root<infer Node>
        ? Str.References<Node>
        : Obj.References<Tree, PreserveStructure>

    export type BadDefinitionType =
        | undefined
        | null
        | boolean
        | number
        | bigint
        | Function
        | symbol

    const badDefinitionTypeMessage =
        "Type definitions must be strings or objects."

    type BadDefinitionTypeMessage = typeof badDefinitionTypeMessage

    export const parse: Node.parseFn<unknown> = (def, ctx) => {
        if (typeof def === "string") {
            return Str.parse(def, ctx)
        }
        if (typeof def === "object" && def !== null) {
            return Obj.parse(def, ctx)
        }
        throw new Node.parseError(
            badDefinitionTypeMessage + ` (got ${typeof def}).`
        )
    }
}
