import {
    ElementOf,
    Evaluate,
    Exact,
    KeyValuate,
    ListPossibleTypes,
    narrow,
    transform,
    Unlisted
} from "@re-do/utils"
import { ExtractableDefinition, root, UnvalidatedTypeSet } from "./common.js"

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

export type ParentComponent = {
    implemented: ComponentMethodName[]
}

export type BaseComponentInput = {
    name: string
    def: Root.Definition
    parent: any
    matches: (args: MatchesArgs) => boolean
    children?: string[]
}

export type ComponentInput<Input extends BaseComponentInput> =
    BaseComponentInput &
        ("children" extends keyof Input
            ? Partial<AvailableComponentMethods<Input>>
            : AvailableComponentMethods<Input>)

export type ComponentMethods<Def> = {
    allows: (args: AllowsArgs<Def>) => ValidationErrors
    references: (args: ReferencesArgs<Def>) => any
    getDefault: (args: BaseArgs<Def>) => any
}

export type AvailableComponentMethods<Input extends BaseComponentInput> = Omit<
    ComponentMethods<Input["def"]>,
    Input["parent"] extends null
        ? never
        : Unlisted<Input["parent"]["implemented"]>
>

export type Component<Input extends BaseComponentInput> = Evaluate<
    Omit<Input, "children" | ComponentMethodName> &
        ComponentMethods<KeyValuate<Input, "def">> & {
            children: () => any[]
            implemented: ListPossibleTypes<
                Extract<
                    ComponentMethodName,
                    | keyof Input
                    | (Input["parent"] extends null
                          ? never
                          : ElementOf<Input["parent"]["implemented"]>)
                >
            >
        }
>

export type ResolveHandlerArgs = {
    input: BaseComponentInput
    method: ComponentMethodName
}

const componentMethods = narrow(["allows", "references", "getDefault"])

type ComponentMethodName = Unlisted<typeof componentMethods>

const registeredComponents: Record<string, Component<any>> = {}

const getComponent = (name: string) => {
    if (name in registeredComponents) {
        return registeredComponents[name]
    }
    throw new Error(`No component exists with name '${name}'.`)
}

const registerComponent = (name: string, component: Component<any>) =>
    (registeredComponents[name] = component)

export const component = <Input extends BaseComponentInput>(
    input: Exact<Input, ComponentInput<Input>>
): Component<Input> => {
    const methods = transform(componentMethods, ([i, method]) => [
        method,
        resolveHandler({ input: input as any, method })
    ])
    const componentToRegister = {
        name: input.name,
        parent: input.parent,
        matches: input.matches,
        children: () =>
            "children" in input
                ? // @ts-ignore
                  input.children.map((name) => getComponent(name))
                : [],
        implemented: componentMethods.filter((method) => method in input),
        ...methods
    } as any
    registerComponent(input.name, componentToRegister)
    return componentToRegister
}

export const resolveHandler =
    (resolveArgs: ResolveHandlerArgs) => (methodArgs: any) => {
        const findMatchingDescendant = (
            candidate: Component<any>
        ): Component<any> => {
            if (candidate.implemented.includes(resolveArgs.method)) {
                return candidate
            }
            for (const subcomponent of candidate.children()) {
                if (subcomponent.matches(methodArgs)) {
                    return findMatchingDescendant(subcomponent)
                }
            }
            throw new Error(
                `Unable to find a component to resolve ${resolveArgs.method} for ${methodArgs.definition}.`
            )
        }
        const resolvedComponent = getComponent(resolveArgs.input.name)
        const matchingDescendent: any =
            findMatchingDescendant(resolvedComponent)
        return matchingDescendent[resolveArgs.method]
    }
