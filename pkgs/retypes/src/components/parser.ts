import {
    DiffUnions,
    ElementOf,
    Evaluate,
    Exact,
    ExcludeByValue,
    Func,
    KeyValuate,
    ListPossibleTypes,
    memoize,
    narrow,
    RequiredKeys,
    stringify,
    StringifyPossibleTypes,
    transform,
    Unlisted
} from "@re-do/utils"
import { ExtractableDefinition, UnvalidatedTypeSet } from "./common.js"

export type MatchesArgs<DefType> = {
    definition: DefType
    typeSet: UnvalidatedTypeSet
}

export type ParseArgs<DefType> = {
    definition: DefType
    typeSet: UnvalidatedTypeSet
    path: string[]
    seen: string[]
}

export type AllowsOptions = {
    ignoreExtraneousKeys?: boolean
}

export type ReferencesOptions = {
    includeBuiltIn?: boolean
}

export type GetDefaultOptions = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle?: any
}

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export type ParentNode<
    DefType = any,
    Implemented extends InheritableParserMethods<DefType> = InheritableParserMethods<DefType>
> = {
    type: DefType
    implemented: Implemented
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
    parent: () => ParentNode
    matches: DefinitionMatcher<ParentNode>
}

export type DefinitionMatcher<Parent> = Parent extends ParentNode<
    infer ParentDef
>
    ? (args: MatchesArgs<ParentDef>) => boolean
    : never

export type UnimplementedParserMethods<DefType, Parent> = Omit<
    InheritableParserMethods<DefType>,
    keyof PreviouslyImplementedMethods<Parent>
>

type AnyNode = ParserNode<any, ParentNode, any>

export type PreviouslyImplementedMethods<Parent> = Parent extends ParentNode<
    unknown,
    infer Implemented
>
    ? Implemented
    : never

export type ParserNode<
    DefType,
    Parent extends ParentNode,
    Methods extends UnimplementedParserMethods<DefType, Parent>
> = Evaluate<
    BaseNodeInput<DefType, Parent> & {
        implemented: RequiredKeys<Methods> extends never
            ? {}
            : Methods & PreviouslyImplementedMethods<Parent>
    }
>

export type InheritableParserMethods<DefType> = {
    [MethodName in ParserMethodName]?: WithParseArgs<
        ParserMethods<DefType>[MethodName],
        DefType
    >
}

export type WithParseArgs<
    ParserMethod extends Func,
    DefType
> = ParserMethod extends Func<[...infer MainArgs, infer Options], infer Return>
    ? (
          ...args: [...main: MainArgs, options: Options & ParseArgs<DefType>]
      ) => Return
    : never

export type ParserMethods<DefType> = {
    allows: (
        assignmentFrom: ExtractableDefinition,
        options?: AllowsOptions
    ) => ValidationErrors
    references: (options?: ReferencesOptions) => any
    getDefault: (options?: GetDefaultOptions) => any
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
        implemented: {
            ...input.parent().implemented,
            ...input.implements
        }
    } as any)

export type Parser<DefType> = (
    args: ParseArgs<DefType>
) => ParserMethods<DefType> & {
    matches: boolean
}

type ParserMethodName = keyof ParserMethods<any>

export type ValidateNode<
    Definition extends AnyNode,
    Children extends AnyParser[],
    ImplementedMethodName = keyof Definition["implemented"],
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
    Children extends AnyParser[]
> = {
    [I in keyof Children]: Children[I] extends Parser<infer ChildDefType>
        ? ChildDefType extends ParentDefType["type"]
            ? Children[I]
            : `Children must have a definition that is assignable to that of their parent.`
        : never
}

export type AnyParser = Parser<any>

const parserMethodNames: ListPossibleTypes<ParserMethodName> = [
    "allows",
    "references",
    "getDefault"
]

// Re:Root, reroot its root by rerouting to reroot
export const reroot = {
    type: {} as any,
    implemented: {}
}

export const createParser =
    <Node extends AnyNode, Children extends AnyParser[] = []>(
        node: ValidateNode<Node, Children>,
        ...children: Children //ValidateChildren<Node, Children>
    ): Parser<Node["type"]> =>
    (args) => {
        const validatedChildren = children as AnyParser[]
        const methods: ParserMethods<Node["type"]> = transform(
            parserMethodNames,
            ([i, methodName]) => {
                const implemented: InheritableParserMethods<Node["type"]> =
                    node.implemented
                if (implemented[methodName]) {
                    return [methodName, implemented[methodName]]
                }
                const delegate = validatedChildren.find(
                    (child) => child(args).matches
                )
                if (!delegate) {
                    throw new Error(
                        `None of ${stringify(
                            validatedChildren
                        )} provides a matching parser for ${args.definition}.`
                    )
                }
                return [methodName, delegate(args)[methodName]]
            }
        )
        return {
            matches: node.matches(args),
            ...methods
        }
    }
