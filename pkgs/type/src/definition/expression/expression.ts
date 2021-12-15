import {
    typeDefProxy,
    DefinitionTypeError,
    createParser,
    ParseConfig
} from "./internal.js"
import { Root } from "../root.js"
import { Str } from "./str.js"
import { Num } from "../builtin/num.js"

export namespace Shallow {
    export type Definition<Def extends string | number = string | number> = Def

    export type Validate<
        Def extends Definition,
        Typespace
    > = Def extends Num.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Validate<Def, Typespace>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        Typespace,
        Options extends ParseConfig
    > = Def extends Num.Definition<infer Value>
        ? Value
        : Def extends Str.Definition
        ? Str.Parse<Def, Typespace, Options>
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
