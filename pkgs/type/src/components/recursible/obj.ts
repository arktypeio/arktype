import {
    diffSets,
    DiffSetsResult,
    Evaluate,
    isRecursible,
    transform
} from "@re-do/utils"
import {
    ParseConfig,
    mismatchedKeysError,
    validationError,
    ValidationErrors,
    typeDefProxy,
    createParser,
    ParseResult
} from "./internal.js"
import { Root } from "../root.js"
import { Recursible } from "./recursible.js"
import { Optional } from "../shallow"

export namespace Obj {
    export type Definition<
        Def extends Recursible.Definition = Recursible.Definition
    > = Recursible.Definition<Def> extends any[] ? never : Def

    export type Validate<Def, TypeSet> = Evaluate<{
        [PropName in keyof Def]: Root.Validate<Def[PropName], TypeSet>
    }>

    export type Parse<
        Def,
        TypeSet,
        Options extends ParseConfig,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends Optional.Definition ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = {
        [PropName in OptionalKey]?: Def[PropName] extends Optional.Definition<
            infer OptionalType
        >
            ? Root.Parse<OptionalType, TypeSet, Options>
            : unknown
    } & {
        [PropName in RequiredKey]: Root.Parse<Def[PropName], TypeSet, Options>
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
                        shallowSeen: []
                    })
                ]) as Record<string, ParseResult<any>>
        },
        {
            allows: ({ components, def, ctx }, valueType, opts) => {
                if (!isRecursible(valueType) || Array.isArray(valueType)) {
                    return validationError({ def, path: ctx.path, valueType })
                }
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
                return Object.keys(components)
                    .filter((propName) => propName in valueType)
                    .reduce(
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
            references: ({ components }, opts) =>
                transform(components, ([propName, component]) => [
                    propName,
                    component.references(opts)
                ]),
            generate: ({ components, def, ctx }, opts) =>
                transform(components, ([propName, component]) => {
                    if (
                        typeof def[propName] === "string" &&
                        Optional.parse.meta.matches(def[propName], ctx)
                    ) {
                        // Exclude prop from object's generated value entirely if it's optional
                        return null
                    }
                    return [propName, component.generate(opts)]
                })
        }
    )

    export const delegate = parse as any as Definition
}
