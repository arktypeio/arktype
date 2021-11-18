import {
    diffSets,
    DiffSetsResult,
    isRecursible,
    OptionalKeys,
    transform
} from "@re-do/utils"
import { ValidateRecursible } from "./common.js"
import { Recursible } from "."
import { Optional } from "../shallow/optional.js"
import { createParser, ParsedType } from "../parser.js"
import { typeDefProxy } from "../../common.js"
import { ParseTypeRecurseOptions, Root } from "../common.js"
import {
    mismatchedKeysError,
    validationError,
    ValidationErrors
} from "../errors.js"

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

    export const parse = createParser(
        {
            type,
            parent: () => Recursible.parse,
            matches: (def) => isRecursible(def) && !Array.isArray(def),
            components: (def, ctx) =>
                transform(def, ([prop, propDef]) => [
                    prop,
                    Root.parse(propDef, {
                        ...ctx,
                        path: [...ctx.path, prop],
                        seen: []
                    })
                ]) as Record<string, ParsedType<any>>
        },
        {
            allows: ({ components, def, ctx }, valueType, opts) => {
                // Neither type is a tuple, validate keys as a set
                const keyDiff = diffSets(
                    Object.keys(def),
                    Object.keys(valueType)
                )
                const keyErrors = keyDiff
                    ? Object.entries(keyDiff).reduce((diff, [k, v]) => {
                          const discrepancies: string[] = v
                          if (k === "added" && !opts.ignoreExtraneousKeys) {
                              return { ...diff, added: discrepancies }
                          }
                          if (k === "removed") {
                              // Omit keys defined optional from 'removed'
                              const illegallyRemoved = discrepancies.filter(
                                  (removedKey) =>
                                      typeof def[removedKey] !== "string" ||
                                      !def[removedKey].endsWith("?")
                              )
                              return illegallyRemoved.length
                                  ? { ...diff, removed: illegallyRemoved }
                                  : diff
                          }
                          return diff
                      }, undefined as DiffSetsResult<string>)
                    : undefined
                if (keyErrors) {
                    return validationError({
                        message: mismatchedKeysError(keyErrors),
                        path: ctx.path
                    })
                }
                return Object.keys(def).reduce(
                    (errors, propName) => ({
                        ...errors,
                        ...components[propName].allows(
                            (valueType as any)[propName],
                            opts
                        )
                    }),
                    {} as ValidationErrors
                )
            },
            generate: () => [],
            references: () => []
        }
    )

    export const delegate = parse as any as Definition
}
