import {
    DiffUnions,
    ElementOf,
    Evaluate,
    Exact,
    ExcludeByValue,
    KeyValuate,
    ListPossibleTypes,
    narrow,
    RequiredKeys,
    StringifyPossibleTypes,
    transform,
    Unlisted
} from "@re-do/utils"
import { ExtractableDefinition, UnvalidatedTypeSet } from "./common.js"

export type MatchesArgs<DefType = any> = {
    definition: DefType
    typeSet: UnvalidatedTypeSet
}

export type BaseArgs<DefType = any> = MatchesArgs<DefType> & {
    path: string[]
    seen: string[]
}

export type AllowsArgs<
    DefType = any,
    Assignment = ExtractableDefinition
> = BaseArgs<DefType> & {
    assignment: Assignment
    ignoreExtraneousKeys: boolean
}

export type ReferencesArgs<DefType = any> = BaseArgs<DefType> & {
    includeBuiltIn: boolean
}

export type GetDefaultArgs<DefType = any> = BaseArgs<DefType> & {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle: any
}

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export type ParentNode<
    DefType = any,
    Implements extends Partial<ParserMethods<DefType>> = Partial<
        ParserMethods<DefType>
    >,
    Inherits extends Partial<ParserMethods<DefType>> = Partial<
        ParserMethods<DefType>
    >
> = {
    type: DefType
    implements: Implements
    inherits: Inherits
}

export type NodeInput<
    DefType,
    Parent extends ParentNode,
    Methods extends UnimplementedParserMethods<DefType, Parent>
> = BaseNodeInput<DefType, Parent> & {
    implements?: Methods
}

export type BaseNodeInput<DefType, ParentNode> = {
    type: DefType
    parent: ParentNode
    matches: DefinitionMatcher<ParentNode>
}

export type DefinitionMatcher<Parent> = Parent extends ParentNode<
    infer ParentDef
>
    ? (args: MatchesArgs<ParentDef>) => boolean
    : never

export type UnimplementedParserMethods<DefType, Parent> = Omit<
    Partial<ParserMethods<DefType>>,
    Parent extends ParentNode<
        infer ParentDefType,
        infer Implements,
        infer Inherits
    >
        ? keyof Implements | keyof Inherits
        : never
>

type AnyNode = ParserNode<any, ParentNode, any>

export type ParserNode<
    DefType,
    Parent extends ParentNode,
    Methods extends UnimplementedParserMethods<DefType, Parent>
> = Evaluate<
    BaseNodeInput<DefType, Parent> & {
        inherits: Parent extends ParentNode<
            infer DefType,
            infer Implements,
            infer Inherits
        >
            ? Implements & Inherits
            : {}
        implements: RequiredKeys<Methods> extends never ? {} : Methods
    }
>

export type ParserMethods<DefType> = {
    allows: (args: AllowsArgs<DefType>) => ValidationErrors
    references: (args: ReferencesArgs<DefType>) => any
    getDefault: (args: BaseArgs<DefType>) => any
}

export const createNode = <
    DefType,
    Parent extends ParentNode,
    Methods extends UnimplementedParserMethods<DefType, Parent>
>(
    input: NodeInput<DefType, Parent, Methods>
): ParserNode<DefType, Parent, Methods> =>
    ({
        ...input,
        inherits: { ...input.parent.inherits, ...input.parent.implements }
    } as any)

export type Parser<DefType> = ParserMethods<DefType> & {
    matches: DefinitionMatcher<DefType>
}

type ParserMethodName = keyof ParserMethods<any>

export type ValidateNode<
    Definition extends AnyNode,
    Children extends Parser<any>[],
    ImplementedMethodName =
        | keyof Definition["implements"]
        | keyof Definition["inherits"],
    MissingMethodNames extends ParserMethodName[] = ListPossibleTypes<
        Exclude<ParserMethodName, ImplementedMethodName>
    >
> = Children extends never[]
    ? MissingMethodNames extends never[]
        ? Definition
        : `The following methods were never implemented for this branch: ${StringifyPossibleTypes<`'${Unlisted<MissingMethodNames>}'`>}.`
    : Definition

export type ValidateChildren<
    ParentDefType extends AnyNode,
    Children extends Parser<any>[]
> = {
    [I in keyof Children]: Children[I] extends Parser<infer ChildDefType>
        ? ChildDefType extends ParentDefType["type"]
            ? Children[I]
            : `Children must have a definition that is assignable to that of their parent.`
        : never
}

export const createParser = <
    Definition extends AnyNode,
    Children extends Parser<any>[] = []
>(
    node: ValidateNode<Definition, Children>,
    ...children: ValidateChildren<Definition, Children>
) => ({} as Parser<Definition["type"]>)
//
//Evaluate<ValidateNode<Definition, Children>>
