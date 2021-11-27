import { Root, ValidateTypeRecurseOptions } from "../components/common.js"
import { Obj } from "../components/recursible/obj.js"
import { ParsedType, ParseTypeRecurseOptions } from "../parse.js"
import { TypeSetMember } from "./member.js"
import { DefaultParseTypeOptions } from "../definition.js"
import {
    DiffUnions,
    ElementOf,
    Evaluate,
    KeyValuate,
    MergeAll,
    StringifyPossibleTypes,
    UnionDiffResult,
    Unlisted
} from "@re-do/utils"

export namespace TypeSet {
    export type Definition<Def extends Obj.Definition = Obj.Definition> =
        Obj.Definition<Def>

    export type TypeNameFromList<Definitions> = keyof MergeAll<Definitions> &
        string

    export type ValidateMemberList<
        Definitions,
        DeclaredTypeNames extends string[] = [],
        Merged = TypeSet.Validate<MergeAll<Definitions>>,
        DefinedTypeName extends string = keyof Merged & string,
        DeclaredTypeName extends string = DeclaredTypeNames extends never[]
            ? DefinedTypeName
            : ElementOf<DeclaredTypeNames>,
        ErrorMessage extends string = MissingTypesError<
            DeclaredTypeName,
            DefinedTypeName
        >
    > = {
        [I in keyof Definitions]: ErrorMessage & {
            [TypeName in keyof Definitions[I]]: TypeName extends DeclaredTypeName
                ? KeyValuate<Merged, TypeName>
                : `${TypeName & string} was never declared.`
        }
    }

    export type MergeMemberList<Definitions> = MergeAll<Definitions>

    // Just use unknown for now since we don't have all the definitions yet
    // but we still want to allow references to other declared types
    export type ValidateReferences<
        Def,
        DeclaredTypeName extends string,
        Options extends ValidateTypeRecurseOptions = {}
    > = Root.Validate<
        Def,
        {
            [TypeName in DeclaredTypeName]: "unknown"
        },
        Options
    >

    export type Validate<
        TypeSet,
        Options extends ValidateTypeRecurseOptions = {}
    > = Evaluate<{
        [TypeName in keyof TypeSet]: TypeSetMember.Validate<
            TypeSet[TypeName],
            TypeSet,
            Options
        >
    }>

    export type Parse<
        TypeSet,
        Options extends ParseTypeRecurseOptions = DefaultParseTypeOptions
    > = Evaluate<{
        [TypeName in keyof TypeSet]: ParsedType<
            TypeSet[TypeName],
            Validate<TypeSet>,
            Options
        >
    }>
}

export type MissingTypesError<DeclaredTypeName, DefinedTypeName> = DiffUnions<
    DeclaredTypeName,
    DefinedTypeName
    // Extraneous definition errors are handled by ValidateMemberList
> extends UnionDiffResult<infer Extraneous, infer Missing>
    ? Missing extends []
        ? {}
        : `Declared types ${StringifyPossibleTypes<`'${ElementOf<Missing>}'`>} were never defined.`
    : never
