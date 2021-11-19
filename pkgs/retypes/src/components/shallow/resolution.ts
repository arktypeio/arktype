import {
    Cast,
    ElementOf,
    FilterByValue,
    IntersectProps,
    Iteration,
    KeyValuate,
    ListPossibleTypes,
    Merge,
    Or,
    Split,
    stringify,
    StringifyPossibleTypes,
    StringReplace
} from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import { compile, TypeSet } from "../../compile.js"
import {
    ValidationErrorMessage,
    ShallowCycleError,
    shallowCycleError,
    UnknownTypeError,
    InferrableValidationErrorMessage
} from "../errors.js"
import { createParser, ParsedType, Parser } from "../parser.js"
import {
    BuiltInTypeName,
    ControlCharacter,
    ControlCharacters,
    ParseTypeRecurseOptions,
    Root,
    UnvalidatedTypeSet,
    ValidateTypeRecurseOptions
} from "./common.js"
import { Fragment } from "./fragment.js"

type ExtractReferences<
    Def extends string,
    Filter extends string = string
> = RawReferences<Def> & Filter

type RawReferences<
    Fragments extends string,
    RemainingControlCharacters extends string[] = ControlCharacters
> = RemainingControlCharacters extends Iteration<
    string,
    infer Character,
    infer Remaining
>
    ? RawReferences<ElementOf<Split<Fragments, Character>>, Remaining>
    : Exclude<ElementOf<Split<Fragments, RemainingControlCharacters[0]>>, "">

type ExtractReferenceList<
    Def extends string,
    Filter extends string = string
> = ListPossibleTypes<RawReferences<Def> & Filter>

type CheckReferencesForShallowCycle<
    References extends string[],
    TypeSet,
    Seen
> = References extends Iteration<string, infer Current, infer Remaining>
    ? CheckForShallowCycleRecurse<
          KeyValuate<TypeSet, Current>,
          TypeSet,
          Seen | Current
      > extends never
        ? CheckReferencesForShallowCycle<Remaining, TypeSet, Seen>
        : CheckForShallowCycleRecurse<
              KeyValuate<TypeSet, Current>,
              TypeSet,
              Seen | Current
          >
    : never

type CheckForShallowCycleRecurse<Def, TypeSet, Seen> = Def extends Seen
    ? Seen
    : Def extends string
    ? CheckReferencesForShallowCycle<ExtractReferenceList<Def>, TypeSet, Seen>
    : never

type CheckForShallowCycle<Def, TypeSet> = CheckForShallowCycleRecurse<
    Def,
    TypeSet,
    never
>

export namespace Resolution {
    export type Definition<
        TypeSet,
        Def extends keyof TypeSet & string = keyof TypeSet & string
    > = Def

    export type Validate<
        TypeName extends keyof TypeSet & string,
        Root,
        TypeSet,
        Options extends ValidateTypeRecurseOptions
    > = TypeSet[TypeName] extends ValidationErrorMessage
        ? TypeSet[TypeName]
        : // CheckForShallowCycle<TypeName, TypeSet> extends never
        // ?
        Options["extractTypesReferenced"] extends true
        ? TypeName
        : Root
    // : ShallowCycleError<TypeName, CheckForShallowCycle<TypeName, TypeSet>>

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
