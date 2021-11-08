import { ExtractableDefinition, UnvalidatedTypeSet } from "./common.js"

export * as Root from "./root.js"
import * as Root from "./root.js"

export type BaseArgs<definition = Root.Definition> = {
    definition: definition
    typeSet: UnvalidatedTypeSet
    path: string[]
    seen: string[]
}

export type AllowsAssignmentArgs<
    Def = Root.Definition,
    From = ExtractableDefinition
> = {
    from: From
    ignoreExtraneousKeys: boolean
} & BaseArgs<Def>

export type ExtractReferencesArgs<Def = Root.Definition> = {
    includeBuiltIn: boolean
} & BaseArgs<Def>

export type GetDefaultArgs<Def = Root.Definition> = {
    // By default, we will throw if we encounter a cyclic required type
    // If this options is provided, we will return its value instead
    onRequiredCycle: any
} & BaseArgs<Def>

// Paths at which errors occur mapped to their messages
export type ValidationErrors = Record<string, string>

export type Component<
    ParentDefinition extends Root.Definition = Root.Definition,
    ComponentDefinition extends ParentDefinition = ParentDefinition
> =
    | DeepComponent<ParentDefinition, ComponentDefinition>
    | ShallowComponent<ParentDefinition, ComponentDefinition>

export type DeepComponent<
    Checked extends Root.Definition = Root.Definition,
    Handled extends Checked = Checked
> = {
    matches: (args: BaseArgs<Checked>) => boolean
    children: Component<Handled, any>[]
} & Partial<ShallowComponent<Checked, Handled>>

export type ShallowComponent<
    Checked extends Root.Definition = Root.Definition,
    Handled extends Checked = Checked
> = {
    matches: (args: BaseArgs<Checked>) => boolean
    allowsAssignment: (args: AllowsAssignmentArgs<Handled>) => ValidationErrors
    extractReferences: (args: ExtractReferencesArgs<Handled>) => any
    getDefault: (args: BaseArgs<Handled>) => any
}

export type FindMatchingComponentArgs = BaseArgs & {
    methodName: Exclude<keyof ShallowComponent, "matches">
}

export const findMatchingComponent = (args: FindMatchingComponentArgs) => {
    const recurse = (component: Component): Component => {
        if (args.methodName in component) {
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
    const component = recurse({} as any)
    return component
}
