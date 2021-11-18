import {
    Cast,
    ElementOf,
    Merge,
    Or,
    stringify,
    StringifyPossibleTypes
} from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import {
    ValidationErrorMessage,
    ShallowCycleError,
    shallowCycleError,
    UnknownTypeError,
    InferrableValidationErrorMessage
} from "../errors.js"
import { createParser, ParsedType, Parser } from "../parser.js"
import {
    ParseTypeRecurseOptions,
    Root,
    UnvalidatedTypeSet,
    ValidateTypeRecurseOptions
} from "./common.js"
import { Fragment } from "./fragment.js"
import { Str } from "./str.js"

type CheckForShallowCycle<
    TypeName extends string & keyof TypeSet,
    TypeSet,
    Options extends { shallowSeen: any }
> = TypeName extends keyof Options["shallowSeen"]
    ? ShallowCycleError<TypeName, TypeSet, Options["shallowSeen"]>
    : (
          TypeSet[TypeName] extends string
              ? Str.Validate<
                    TypeSet[TypeName] & string,
                    TypeSet,
                    Options & {
                        extractTypesReferenced: false
                        includeBuiltIn: false
                        shallowSeen: { [Name in TypeName]: true }
                    }
                >
              : ""
      ) extends InferrableValidationErrorMessage<infer E>
    ? E & string
    : ""

export namespace Resolution {
    export type Definition<
        TypeSet,
        Def extends keyof TypeSet & string = keyof TypeSet & string
    > = Def

    export type Validate<
        TypeName extends keyof TypeSet & string,
        Root,
        TypeSet,
        Options extends ValidateTypeRecurseOptions,
        ShallowCycleCheckResult extends string = CheckForShallowCycle<
            TypeName,
            TypeSet,
            Options
        >
    > = ShallowCycleCheckResult extends ShallowCycleError
        ? ShallowCycleCheckResult
        : Options["extractTypesReferenced"] extends true
        ? TypeName
        : Root

    export type Parse<
        TypeName extends keyof TypeSet & string,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = TypeSet[TypeName] extends ValidationErrorMessage
        ? unknown
        : TypeName extends keyof Options["seen"]
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

    export const type = typeDefProxy as string

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            matches: (def, ctx) => def in ctx.typeSet,
            components: (def, ctx) => {
                /**
                 * Keep track of definitions we've seen since last resolving to an object or built-in.
                 * If we encounter the same definition twice, we're dealing with a shallow cyclic typeSet
                 * like {user: "person", person: "user"}.
                 **/
                if (ctx.seen.includes(def)) {
                    throw new Error(
                        shallowCycleError({
                            def,
                            ctx
                        })
                    )
                }
                return {
                    resolution: Root.parse(ctx.typeSet[def], {
                        ...ctx,
                        seen: [...ctx.seen, def]
                    })
                }
            }
        },
        {
            allows: ({ components: { resolution } }, valueType, opts) =>
                resolution.allows(valueType, opts),
            generate: ({ components: { resolution } }, opts) =>
                resolution.generate(opts),
            references: ({ def }, opts) => [def]
        }
    )

    export const delegate = parse as any as string
}
