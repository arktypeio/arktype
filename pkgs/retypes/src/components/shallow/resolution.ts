import { Or } from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import { shallowCycleError, UnknownTypeError } from "../errors.js"
import { createParser } from "../parser.js"
import { ParseTypeRecurseOptions, Root } from "./common.js"
import { Fragment } from "./fragment.js"

export namespace Resolution {
    export type Definition<
        DeclaredTypeName extends string = string,
        Def extends DeclaredTypeName = DeclaredTypeName
    > = Def

    export type Validate<
        Def extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = Def extends DeclaredTypeName ? Def : UnknownTypeError<Def>

    export type Parse<
        TypeName extends keyof TypeSet,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = TypeName extends keyof Options["seen"]
        ? Options["onCycle"] extends never
            ? ParseResolvedNonCyclicDefinition<TypeName, TypeSet, Options>
            : ParseResolvedCyclicDefinition<TypeName, TypeSet, Options>
        : ParseResolvedNonCyclicDefinition<TypeName, TypeSet, Options>

    export type ParseResolvedCyclicDefinition<
        TypeName extends keyof TypeSet,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Root.Parse<
        Options["onCycle"],
        Omit<TypeSet, "cyclic"> & { cyclic: TypeSet[TypeName] },
        {
            onCycle: Options["deepOnCycle"] extends true
                ? Options["onCycle"]
                : never
            seen: {}
            onResolve: Options["onResolve"]
            deepOnCycle: Options["deepOnCycle"]
        }
    >

    export type ParseResolvedNonCyclicDefinition<
        TypeName extends keyof TypeSet,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Or<
        Options["onResolve"] extends never ? true : false,
        TypeName extends "resolved" ? true : false
    > extends true
        ? Root.Parse<
              TypeSet[TypeName],
              TypeSet,
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >
        : Root.Parse<
              Options["onResolve"],
              Omit<TypeSet, "resolved"> & { resolved: TypeSet[TypeName] },
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        matches: (definition, typeSet) => definition in typeSet,
        implements: {
            allows: (definition, context, assignment, opts) => {
                /**
                 * Keep track of definitions we've seen since last resolving to an object or built-in.
                 * If we encounter the same definition twice, we're dealing with a shallow cyclic typeSet
                 * like {user: "person", person: "user"}.
                 **/
                if (context.seen.includes(definition)) {
                    throw new Error(
                        shallowCycleError({
                            definition,
                            context,
                            assignment
                        })
                    )
                }
                // If defined refers to a new type in typeSet, start resolving its definition
                return Root.parse(context.typeSet[definition], {
                    ...context,
                    seen: [...context.seen, definition]
                }).allows(assignment)
            }
        }
    })

    export const delegate = parse as any as Definition
}
