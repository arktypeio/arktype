import { IsAnyOrUnknown } from "@re-/tools"
import { Base } from "./base/index.js"
import { Literal } from "./literal.js"
import { Obj } from "./obj/index.js"
import { Str } from "./str/index.js"

export namespace Root {
    export type Parse<Def, Dict> = IsAnyOrUnknown<Def> extends true
        ? Base.Parsing.Types.Terminal<Def, Def>
        : Def extends string
        ? Str.Parse<Def, Dict>
        : Def extends BadDefinitionType
        ? Base.Parsing.Types.Error<BadDefinitionTypeMessage<Def>>
        : Def extends object
        ? Obj.Parse<Def, Dict>
        : Def extends Literal.Definition
        ? Base.Parsing.Types.Terminal<Def, Def>
        : Base.Parsing.Types.Error<"Unexpected definition type.">

    export type Validate<Tree> = Tree extends Base.Parsing.Types.Terminal<
        infer Def,
        unknown,
        infer Error
    >
        ? Error extends string
            ? Error
            : Def
        : Tree extends Str.Root
        ? Str.Validate<Tree>
        : Obj.Validate<Tree>

    export type TypeOf<Tree> = Tree extends Base.Parsing.Types.Terminal<
        unknown,
        infer Type
    >
        ? Type
        : Tree extends Str.Root
        ? Str.TypeOf<Tree>
        : Obj.TypeOf<Tree>

    export type References<
        Def,
        Dict,
        PreserveStructure extends boolean
    > = Def extends string
        ? Str.References<Def>
        : Def extends Literal.Definition
        ? [Literal.DefToString<Def>]
        : Def extends object
        ? Obj.References<Def, Dict, PreserveStructure>
        : []

    export type BadDefinitionType = Function | symbol

    type BadDefinitionTypeMessage<Def extends BadDefinitionType> =
        `Values of type ${Def extends Function
            ? "function"
            : "symbol"} are not valid definitions.`

    export const parse: Base.Parsing.Parser<unknown> = (def, ctx) => {
        if (Str.matches(def)) {
            ctx.stringRoot = def
            return Str.parse(def, ctx)
        }
        if (Obj.matches(def)) {
            return Obj.parse(def, ctx)
        }
        if (Literal.matches(def)) {
            return new Literal.Node(def, ctx)
        }
        throw new Base.Parsing.ParseError(
            `${
                ctx.path ? `At path ${ctx.path}, values` : "Values"
            } of type ${typeof def} are not valid definitions.`
        )
    }
}
