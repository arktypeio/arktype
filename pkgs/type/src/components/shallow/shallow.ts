import {
    typeDefProxy,
    DefinitionTypeError,
    createParser,
    ParseConfig
} from "./common.js"
import { Root } from "../root.js"
import { Str } from "./str.js"
import { Num } from "./num.js"

export namespace Shallow {
    export type Definition<Def extends string | number = string | number> = Def

    export type Validate<
        Def extends Definition,
        TypeSet
    > = Def extends Num.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Validate<Def, TypeSet>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseConfig
    > = Def extends Num.Definition<infer Value>
        ? Value
        : Def extends Str.Definition
        ? Str.Parse<Def, TypeSet, Options>
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Root.parse,
        children: () => [Num.delegate, Str.delegate],
        matches: (definition) =>
            typeof definition === "number" || typeof definition === "string"
    })

    export const delegate = parse as any as Definition
}
