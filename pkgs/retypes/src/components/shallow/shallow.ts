import {
    ParseTypeRecurseOptions,
    ValidateTypeRecurseOptions
} from "./common.js"
import { Str } from "./str.js"
import { Num } from "./num.js"
import { Root } from "../common.js"
import { createParser, ParseArgs, Parser } from "../parser.js"
import { DefinitionTypeError } from "../errors.js"
import { typeDefProxy } from "../../common.js"
import { DefaultValidateTypeOptions } from "../../definition.js"

export namespace Shallow {
    export type Definition<Def extends string | number = string | number> = Def

    export type Validate<
        Def extends Definition,
        TypeSet,
        Options extends ValidateTypeRecurseOptions
    > = Def extends Num.Definition
        ? Def
        : Def extends Str.Definition
        ? Str.Validate<Def, TypeSet, Options>
        : DefinitionTypeError

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Def extends Num.Definition<infer Value>
        ? Value
        : Def extends Str.Definition
        ? Str.Parse<Def, TypeSet, Options>
        : DefinitionTypeError

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
