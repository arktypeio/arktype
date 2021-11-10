import { defineComponent, ComponentDefinitionInput } from "../component.js"
import { Fragment, Str } from "./index.js"

export namespace Optional {
    export type Definition<
        Def extends Fragment.Definition = Fragment.Definition
    > = `${Def}?`
}

export const optional = defineComponent<Str.Definition, Optional.Definition>({
    matches: ({ definition }) => definition.endsWith("?"),
    children: []
    // allowsAssignment: (args) => {
    //     if (args.from === "undefined") {
    //         return {}
    //     }
    //     return fragment.allowsAssignment({
    //         ...args,
    //         definition: args.definition.slice(0, -1)
    //     })
    // },
    // getDefault: () => undefined,
    // extractReferences: (args) =>
    //     fragment.extractReferences({
    //         ...args,
    //         definition: args.definition.slice(0, -1)
    //     })
})
