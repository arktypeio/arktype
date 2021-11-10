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

export type MatchesArgs<Def = any> = {
    definition: Def
    typeSet: UnvalidatedTypeSet
}

export type BaseArgs<Def = any> = MatchesArgs<Def> & {
    path: string[]
    seen: string[]
}

export type AllowsArgs<
    Def = any,
    Assignment = ExtractableDefinition
> = BaseArgs<Def> & {
    assignment: Assignment
    ignoreExtraneousKeys: boolean
}

export type ReferencesArgs<Def = any> = BaseArgs<Def> & {
    includeBuiltIn: boolean
}

export type GetDefaultArgs<Def = any> = BaseArgs<Def> & {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle: any
}

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export type ParentComponent<
    Def = any,
    Implements extends Partial<ComponentMethods<Def>> = Partial<
        ComponentMethods<Def>
    >,
    Inherits extends Partial<ComponentMethods<Def>> = Partial<
        ComponentMethods<Def>
    >
> = {
    def: Def
    implements: Implements
    inherits: Inherits
}

export type ComponentInput<
    Def,
    Parent extends ParentComponent,
    Methods extends ImplementedMethods<Def, Parent, Children>,
    Children extends string[]
> = BaseComponentInput<Def, Parent> & {
    children?: Children
} & (Children extends never[]
        ? { implements: Methods }
        : {
              implements?: Methods
          })

export type ImplementedMethods<Def, Parent, Children> = Children extends never[]
    ? AvailableComponentMethods<Def, Parent>
    : Partial<AvailableComponentMethods<Def, Parent>>

export type BaseComponentInput<
    Def,
    Parent,
    ParentDef = Parent extends ParentComponent<infer D> ? D : Root.Definition
> = {
    name: string
    def: Def
    parent: Parent
    matches: (args: MatchesArgs<ParentDef>) => boolean
}

export type ComponentMethods<Def> = {
    allows: (args: AllowsArgs<Def>) => ValidationErrors
    references: (args: ReferencesArgs<Def>) => any
    getDefault: (args: BaseArgs<Def>) => any
}

export type AvailableComponentMethods<Def, Parent> = Omit<
    ComponentMethods<Def>,
    Parent extends ParentComponent<
        infer ParentDef,
        infer Implements,
        infer Inherits
    >
        ? keyof Implements | keyof Inherits
        : never
>

type AnyComponent = Component<any, any, any>

export type Component<Def, Parent, Methods> = Evaluate<
    BaseComponentInput<Def, Parent> &
        ComponentMethods<Def> & {
            children: () => any[]
            inherits: Parent extends ParentComponent<
                infer Def,
                infer Implements,
                infer Inherits
            >
                ? Implements & Inherits
                : {}
            implements: Methods
        }
>

export type ResolveHandlerArgs = {
    input: AnyComponent
    method: ComponentMethodName
}

const componentMethods = narrow(["allows", "references", "getDefault"])

type ComponentMethodName = Unlisted<typeof componentMethods>

const registeredComponents: Record<string, AnyComponent> = {}

const getComponent = (name: string) => {
    if (name in registeredComponents) {
        return registeredComponents[name]
    }
    throw new Error(`No component exists with name '${name}'.`)
}

const registerComponent = (name: string, component: AnyComponent) =>
    (registeredComponents[name] = component)

export const component = <
    Def,
    Parent extends ParentComponent,
    Methods extends ImplementedMethods<Def, Parent, Children>,
    Children extends string[] = []
>(
    input: ComponentInput<Def, Parent, Methods, Children>
): Component<Def, Parent, Methods> => {
    const methods = transform(componentMethods, ([i, method]) => [
        method,
        resolveHandler({ input: input as any, method })
    ])
    const componentToRegister = {
        name: input.name,
        def: input.def,
        parent: input.parent,
        matches: input.matches,
        implements: input.implements,
        children: () =>
            "children" in input
                ? // @ts-ignore
                  input.children.map((name) => getComponent(name))
                : [],
        ...methods
    } as any
    registerComponent(input.name, componentToRegister)
    return componentToRegister
}

export const resolveHandler =
    (resolveArgs: ResolveHandlerArgs) => (methodArgs: any) => {
        const findMatchingDescendant = (
            candidate: AnyComponent
        ): AnyComponent => {
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
