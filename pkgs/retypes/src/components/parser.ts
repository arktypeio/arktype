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
    stringify,
    StringifyPossibleTypes,
    transform,
    Unlisted,
    ValueOf
} from "@re-do/utils"
import { ExtractableDefinition, UnvalidatedTypeSet } from "./common.js"

export type MatchesArgs<DefType = any> = {
    definition: DefType
    typeSet: UnvalidatedTypeSet
}

export type ParserContext = {
    path: string[]
    seen: string[]
}

export type BaseArgs<DefType = any> = MatchesArgs<DefType> & ParserContext

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
    Implements extends InheritableParserMethods<DefType> = InheritableParserMethods<DefType>,
    Inherits extends InheritableParserMethods<DefType> = InheritableParserMethods<DefType>
> = {
    type: DefType
    implements: Implements
    inherits: Inherits
}

export type NodeInput<
    DefType,
    Parent extends ParentNode,
    InheritableMethods extends UnimplementedParserMethods<DefType, Parent>
> = BaseNodeInput<DefType, Parent> & {
    implements?: InheritableMethods
}

export type BaseNodeInput<DefType, Parent extends ParentNode> = {
    type: DefType
    parent: ParentNode
} & UninheritableParserMethods<DefType, Parent>

export type DefinitionMatcher<Parent extends ParentNode> = (
    args: MatchesArgs<Parent["type"]>
) => boolean

export type UninheritableParserMethods<DefType, Parent extends ParentNode> = {
    matches: DefinitionMatcher<Parent>
}

export type UnimplementedParserMethods<DefType, Parent> = Omit<
    InheritableParserMethods<DefType>,
    Parent extends ParentNode<
        infer ParentDefType,
        infer Implements,
        infer Inherits
    >
        ? keyof Implements | keyof Inherits
        : never
>

type AnyNode = ParserNode<any, ParentNode, any> & {
    implements: InheritableParserMethods<any>
}

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

export type InheritableParserMethods<DefType> = Partial<{
    allows: (args: AllowsArgs<DefType>) => ValidationErrors
    references: (args: ReferencesArgs<DefType>) => any
    getDefault: (args: BaseArgs<DefType>) => any
}>

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

export type Parser<DefType, Parent extends ParentNode> = {
    matches: DefinitionMatcher<Parent>
} & Required<InheritableParserMethods<DefType>>

type AnyParser = Parser<any, ParentNode>

type InheritableParserMethodName = keyof InheritableParserMethods<any>

export type ValidateNode<
    Definition extends AnyNode,
    Children extends AnyParser[],
    ImplementedMethodName =
        | keyof Definition["implements"]
        | keyof Definition["inherits"],
    MissingMethodNames extends InheritableParserMethodName[] = ListPossibleTypes<
        Exclude<InheritableParserMethodName, ImplementedMethodName>
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
    [I in keyof Children]: Children[I] extends Parser<infer ChildDefType, any>
        ? ChildDefType extends ParentDefType["type"]
            ? Children[I]
            : `Children must have a definition that is assignable to that of their parent.`
        : never
}

const inheritableParserMethodNames: ListPossibleTypes<InheritableParserMethodName> =
    ["allows", "references", "getDefault"]

export const createParser = <
    Definition extends AnyNode,
    Children extends AnyParser[] = []
>(
    node: ValidateNode<Definition, Children>,
    ...children: ValidateChildren<Definition, Children>
): Parser<Definition["type"], Definition["parent"]> => {
    const validatedChildren = children as AnyParser[]
    const methods: Required<InheritableParserMethods<Definition["type"]>> =
        transform(inheritableParserMethodNames, ([i, methodName]) => {
            if (node.implements[methodName]) {
                return [methodName, node.implements[methodName]]
            } else if (node.inherits[methodName]) {
                return [methodName, node.inherits[methodName]]
            }
            return [
                methodName,
                (args: BaseArgs<any>) => {
                    const match = validatedChildren.find((child) =>
                        child.matches(args)
                    )
                    if (!match) {
                        throw new Error(
                            `None of ${stringify(
                                validatedChildren
                            )} provides a matching parser for ${
                                args.definition
                            }.`
                        )
                    }
                    match[methodName](args as any)
                }
            ]
        })
    return {
        matches: node.matches,
        ...methods
    }
}
