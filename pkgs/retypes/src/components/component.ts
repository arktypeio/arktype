import {
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

export type ComponentInput<
    Def = any,
    Parent = any,
    Children extends string[] = any
> = BaseComponentInput<Def, Parent> & {
    children?: Children
}

export type BaseComponentInput<Def, Parent> = {
    name: string
    def: Def
    parent: Parent
    matches: (args: MatchesArgs<Def>) => boolean
}

export type ComponentMethods<Def> = {
    allows: (args: AllowsArgs<Def>) => ValidationErrors
    references: (args: ReferencesArgs<Def>) => any
    getDefault: (args: BaseArgs<Def>) => any
}

export type AvailableComponentMethods<Def, Parent> = Omit<
    ComponentMethods<Def>,
    Unlisted<KeyValuate<Parent, "implements">> & string
>

export type Component<Def = any, Parent = any, Implements = any> = Evaluate<
    BaseComponentInput<Def, Parent> & {
        children: () => any[] //Component[]
        implements: Implements
    }
>

export type ResolveHandlerArgs = {
    input: ComponentInput
    method: ComponentMethodName
}

const componentMethods = narrow(["allows", "references", "getDefault"])

type ComponentMethodName = Unlisted<typeof componentMethods>

const registeredComponents: Record<string, Component> = {}

const getComponent = (name: string) => {
    if (name in registeredComponents) {
        return registeredComponents[name]
    }
    throw new Error(`No component exists with name '${name}'.`)
}

const registerComponent = (name: string, component: Component) =>
    (registeredComponents[name] = component)

export const component = <
    Def extends Parent extends null
        ? Root.Definition
        : KeyValuate<Parent, "def">,
    Parent extends Component | null,
    Implements extends Children extends []
        ? AvailableComponentMethods<Def, Parent>
        : Partial<AvailableComponentMethods<Def, Parent>>,
    Children extends string[]
>(
    input: ComponentInput<Def, Parent, Children> & Implements
): Component<Def, Parent, Implements> => {
    const methods = transform(componentMethods, ([i, method]) => [
        method,
        resolveHandler({ input, method })
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
        implements: componentMethods.filter((method) => method in input),
        ...methods
    } as any
    registerComponent(input.name, componentToRegister)
    return componentToRegister
}

export const resolveHandler =
    (resolveArgs: ResolveHandlerArgs) => (methodArgs: any) => {
        const findMatchingDescendant = (candidate: Component): Component => {
            if (candidate.implements.includes(resolveArgs.method)) {
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
