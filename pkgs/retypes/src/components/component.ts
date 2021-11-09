import { ListPossibleTypes, transform } from "@re-do/utils"
import { ExtractableDefinition, UnvalidatedTypeSet } from "./common.js"

import { Root } from "./root.js"

export type BaseArgs<definition = Root.Definition> = {
    definition: definition
    typeSet: UnvalidatedTypeSet
    path: string[]
    seen: string[]
}

export type AllowsArgs<
    Def = Root.Definition,
    Assignment = ExtractableDefinition
> = {
    assignment: Assignment
    ignoreExtraneousKeys: boolean
} & BaseArgs<Def>

export type ReferencesArgs<Def = Root.Definition> = {
    includeBuiltIn: boolean
} & BaseArgs<Def>

export type GetDefaultArgs<Def = Root.Definition> = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle: any
} & BaseArgs<Def>

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export type ComponentInput<
    ParentDefinition extends Root.Definition = Root.Definition,
    ComponentDefinition extends ParentDefinition = ParentDefinition
> =
    | DeepComponentInput<ParentDefinition, ComponentDefinition>
    | ShallowComponentInput<ParentDefinition, ComponentDefinition>

export type DeepComponentInput<
    Checked extends Root.Definition = Root.Definition,
    Handled extends Checked = Checked
> = {
    matches: (args: BaseArgs<Checked>) => boolean
    children: ComponentInput<Handled, any>[]
} & Partial<ShallowComponentInput<Checked, Handled>>

export type ShallowComponentInput<
    Checked extends Root.Definition = Root.Definition,
    Handled extends Checked = Checked
> = {
    matches: (args: BaseArgs<Checked>) => boolean
    allows: (args: AllowsArgs<Handled>) => ValidationErrors
    references: (args: ReferencesArgs<Handled>) => any
    getDefault: (args: BaseArgs<Handled>) => any
}

export type Component<
    Checked extends Root.Definition = Root.Definition,
    Handled extends Checked = Checked
> = ShallowComponentInput<Checked, Handled>

export type FindMatchingComponentArgs = BaseArgs & {
    from: ComponentInput
    method: ComponentMethodName
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
) => {
    const inferMethodFromChildren =
        (
            children: DeepComponentInput["children"],
            method: ComponentMethodName
        ) =>
        (args: any) =>
            findMatchingComponent({ ...args, method })[method]!(args)

    const methods = transform(componentMethods, ([i, method]) => [
        method,
        input[method] ??
            inferMethodFromChildren(
                (input as DeepComponentInput).children,
                method
            )
    ])
    return {
        matches: input.matches,
        ...methods
    } as Component<ParentDef, Def>
}

export const findMatchingComponent = (args: FindMatchingComponentArgs) => {
    const recurse = (component: ComponentInput): ComponentInput => {
        if (args.method in component) {
            return component
        }
        if ("children" in component) {
            for (const subcomponent of component.children) {
                if (subcomponent.matches(args)) {
                    return recurse(subcomponent)
                }
            }
        }
        throw new Error(
            `Unable to find a component matching ${args.definition}.`
        )
    }
    const component = recurse(args.from)
    return component
}
