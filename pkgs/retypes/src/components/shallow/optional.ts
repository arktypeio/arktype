import { Component } from "../component.js"
import { fragment } from "./fragment.js"
import { Fragment, Str } from "./index.js"

export type Definition<Def extends Fragment.Definition = Fragment.Definition> =
    `${Def}?`

export const optional: Component<Str.Definition, Definition> = {
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
}
