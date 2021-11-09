import { ListPossibleTypes, transform } from "@re-do/utils"
import { ExtractableDefinition, UnvalidatedTypeSet } from "./common.js"

import { Root } from "./root.js"

export type MatchesArgs<Def = Root.Definition> = {
    definition: Def
    typeSet: UnvalidatedTypeSet
}

export type BaseArgs<Def = Root.Definition> = MatchesArgs<Def> & {
    path: string[]
    seen: string[]
}

export type AllowsArgs<
    Def = Root.Definition,
    Assignment = ExtractableDefinition
> = BaseArgs<Def> & {
    assignment: Assignment
    ignoreExtraneousKeys: boolean
}

export type ReferencesArgs<Def = Root.Definition> = BaseArgs<Def> & {
    includeBuiltIn: boolean
}

export type GetDefaultArgs<Def = Root.Definition> = BaseArgs<Def> & {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle: any
}

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export type ComponentInput<
    Checked extends Root.Definition = Root.Definition,
    Matched extends Checked = Checked
> = BaseComponentInput<Checked> &
    (DeepComponentInput<Matched> | ShallowComponentInput<Matched>)

export type BaseComponentInput<
    Checked extends Root.Definition = Root.Definition
> = { matches: (args: BaseArgs<Checked>) => boolean }

export type DeepComponentInput<
    Definition extends Root.Definition = Root.Definition
> = {
    children: ComponentInput<Definition, any>[]
} & Partial<ShallowComponentInput<Definition>>

export type ShallowComponentInput<
    Definition extends Root.Definition = Root.Definition
> = {
    allows: (args: AllowsArgs<Definition>) => ValidationErrors
    references: (args: ReferencesArgs<Definition>) => any
    getDefault: (args: BaseArgs<Definition>) => any
}

export type Component<
    Checked extends Root.Definition = Root.Definition,
    Matched extends Checked = Checked
> = BaseComponentInput<Checked> & ShallowComponentInput<Matched>

export type ResolveHandlerArgs<
    ParentDef extends Root.Definition,
    Def extends ParentDef,
    Method extends ComponentMethodName
> = {
    input: ComponentInput<ParentDef, Def>
    method: Method
}

type ComponentMethodName = Exclude<keyof ShallowComponentInput, "matches">

const componentMethods: ListPossibleTypes<ComponentMethodName> = [
    "allows",
    "references",
    "getDefault"
]

export const component = <
    ParentDef extends Root.Definition = Root.Definition,
    Def extends ParentDef = ParentDef
>(
    input: ComponentInput<ParentDef, Def>
): Component<ParentDef, Def> => {
    const methods = transform(componentMethods, ([i, method]) => [
        method,
        resolveHandler({ input, method })
    ])
    return {
        matches: input.matches,
        ...methods
    } as any
}

export const resolveHandler =
    <
        ParentDef extends Root.Definition,
        Def extends ParentDef,
        Method extends ComponentMethodName
    >(
        resolveArgs: ResolveHandlerArgs<ParentDef, Def, Method>
    ) =>
    (methodArgs: Parameters<Component[Method]>[0]) => {
        const findMatchingDescendant = (
            candidate: ComponentInput<any, any>
        ): ComponentInput => {
            if (resolveArgs.method in candidate) {
                return candidate
            }
            if ("children" in candidate) {
                for (const subcomponent of candidate.children) {
                    if (subcomponent.matches(methodArgs)) {
                        return findMatchingDescendant(subcomponent)
                    }
                }
            }
            throw new Error(
                `Unable to find a component to resolve ${resolveArgs.method} for ${methodArgs.definition}.`
            )
        }
        return findMatchingDescendant(resolveArgs.input)[resolveArgs.method]!
    }
