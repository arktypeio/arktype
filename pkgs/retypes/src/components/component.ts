import {
    DiffUnions,
    ElementOf,
    Evaluate,
    Exact,
    KeyValuate,
    ListPossibleTypes,
    narrow,
    transform,
    Unlisted
} from "@re-do/utils"
import {
    ExtractableDefinition,
    rootDefinition,
    UnvalidatedTypeSet
} from "./common.js"

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

export type ComponentDefinitionInput<
    Def,
    Parent extends ParentComponent,
    Methods extends ImplementedMethods<Def, Parent>
> = BaseComponentInput<Def, Parent> & {
    implements?: Methods
}

export type ImplementedMethods<Def, Parent> = Partial<
    AvailableComponentMethods<Def, Parent>
>

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

type AnyComponentDefinition = ComponentDefinition<any, ParentComponent, any>

export type ComponentDefinition<
    Def,
    Parent extends ParentComponent,
    Methods extends ImplementedMethods<Def, Parent>
> = Evaluate<
    BaseComponentInput<Def, Parent> & {
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
    input: AnyComponentDefinition
    method: ComponentMethodName
}

const componentMethods = narrow(["allows", "references", "getDefault"])

type ComponentMethodName = Unlisted<typeof componentMethods>

const registeredComponents: Record<string, AnyComponentDefinition> = {}

const getComponent = (name: string) => {
    if (name in registeredComponents) {
        return registeredComponents[name]
    }
    throw new Error(`No component exists with name '${name}'.`)
}

const registerComponent = (name: string, component: AnyComponentDefinition) =>
    (registeredComponents[name] = component)

export const defineComponent = <
    Def,
    Parent extends ParentComponent,
    Methods extends ImplementedMethods<Def, Parent>
>(
    input: ComponentDefinitionInput<Def, Parent, Methods>
): ComponentDefinition<Def, Parent, Methods> =>
    ({
        ...input,
        inherits: { ...input.parent.inherits, ...input.parent.implements }
    } as any)

export type Component<Def> = ComponentMethods<Def>

// export type ValidateChild<
//     Parent extends AnyComponentDefinition,
//     Children extends Component<any>[],
//     RequiredMethods extends ComponentMethodName = Exclude<
//         ComponentMethodName,
//         keyof Parent["implements"] | keyof Parent["inherits"]
//     >
// > = {
//     [I in keyof Children]: DiffUnions<
//         RequiredMethods,
//         keyof Children[I]
//     > extends { added: []; removed: [] }
//         ? Children[I]
//         : DiffUnions<RequiredMethods, keyof Children[I]>
// }

export type ValidateComponent<
    Definition extends AnyComponentDefinition,
    Children extends AnyComponentDefinition[]
> = Children extends never[]
    ? Definition["implements"] & Definition["inherits"] extends Component<any>
        ? Definition
        : "Missed leaf stuff"
    : Definition

export const component = <
    Definition extends AnyComponentDefinition,
    Children extends AnyComponentDefinition[] = []
>(
    component: ValidateComponent<Definition, Children>,
    children?: Children
): ComponentMethods<Definition["def"]> => ({} as any)
//      const methods = transform(componentMethods, ([i, method]) => [
//         method,
//         resolveHandler({ input: input as any, method })
//     ])
//     const componentToRegister = {
//         name: input.name,
//         def: input.def,
//         parent: input.parent,
//         matches: input.matches,
//         inherits: { ...input.parent.inherits, ...input.parent.implements },
//         implements: input.implements,
//         ...methods
//     } as any
//     registerComponent(input.name, componentToRegister)
//     return componentToRegister
// }

export const resolveHandler =
    (resolveArgs: ResolveHandlerArgs) => (methodArgs: any) => {
        const findMatchingDescendant = (
            candidate: AnyComponentDefinition
        ): AnyComponentDefinition => {
            if (candidate.implements.includes(resolveArgs.method)) {
                return candidate
            }
            // @ts-ignore
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
