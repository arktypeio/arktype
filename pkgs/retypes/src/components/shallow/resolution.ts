import { Or } from "@re-do/utils"
import { createNode, NodeInput } from "../parser.js"
import { ParseTypeRecurseOptions, UnknownTypeError, Root } from "./common.js"
import { Fragment } from "./index.js"

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
}

export const resolution = createNode<
    Fragment.Definition,
    Resolution.Definition
>({
    matches: ({ definition, typeSet }) => definition in typeSet,
    children: []
})
