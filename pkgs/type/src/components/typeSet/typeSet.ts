import {
    DiffUnions,
    ElementOf,
    Evaluate,
    IsAny,
    KeyValuate,
    MergeAll,
    StringifyPossibleTypes,
    StringReplace,
    UnionDiffResult
} from "@re-do/utils"
import { ParsedType } from "../../parse.js"
import { ParseConfig } from "./internal.js"
import { TypeSetMember } from "./member.js"
import { Root } from "../root.js"
import { Obj } from "../recursible"

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
        DeclaredTypeName extends string
    > = Root.Validate<
        Def,
        {
            [TypeName in DeclaredTypeName]: "unknown"
        }
    >

    export type Validate<TypeSet> = IsAny<TypeSet> extends true
        ? any
        : Evaluate<{
              [TypeName in keyof TypeSet]: TypeSetMember.Validate<
                  TypeSet[TypeName],
                  TypeSet
              >
          }>

    export type Parse<TypeSet, Options extends ParseConfig> = {
        [TypeName in keyof TypeSet]: ParsedType<
            TypeSet[TypeName],
            Validate<TypeSet>,
            Options
        >
    }
}

export const extraneousTypesErrorMessage = `Defined types @types were never declared.`
export const missingTypesErrorMessage = `Declared types @types were never defined.`

export type MissingTypesError<DeclaredTypeName, DefinedTypeName> = DiffUnions<
    DeclaredTypeName,
    DefinedTypeName
    // Extraneous definition errors are handled by ValidateMemberList
> extends UnionDiffResult<infer Extraneous, infer Missing>
    ? Missing extends []
        ? {}
        : StringReplace<
              typeof missingTypesErrorMessage,
              "@types",
              StringifyPossibleTypes<`'${ElementOf<Missing>}'`>
          >
    : never
