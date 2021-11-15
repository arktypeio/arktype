import { isRecursible, OptionalKeys } from "@re-do/utils"
import { ParseTypeRecurseOptions, Root, ValidateRecursible } from "./common.js"
import { Recursible } from "."
import { Optional } from "../shallow/optional.js"
import { createParser } from "../parser.js"
import { typeDefProxy } from "../../common.js"

export namespace Obj {
    export type Definition<
        Def extends Recursible.Definition = Recursible.Definition
    > = Recursible.Definition<Def> extends any[] ? never : Def

    export type Validate<
        Def,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = ValidateRecursible<Def, DeclaredTypeName, ExtractTypesReferenced>

    export type Parse<
        Def,
        TypeSet,
        Options extends ParseTypeRecurseOptions,
        OptionalKey extends keyof Def = OptionalKeys<Def>,
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = {
        [PropName in OptionalKey]?: Def[PropName] extends Optional.Definition<
            infer OptionalType
        >
            ? Root.Parse<OptionalType, TypeSet, Options>
            : `Expected property ${PropName & string} to be optional.`
    } &
        {
            [PropName in RequiredKey]: Root.Parse<
                Def[PropName],
                TypeSet,
                Options
            >
        }

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Recursible.parse,
        matches: (definition) =>
            isRecursible(definition) && !Array.isArray(definition),
        implements: {}
    })

    export const delegate = parse as any as Definition
}
