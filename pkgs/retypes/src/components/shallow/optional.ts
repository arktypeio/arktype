import { createNode, NodeInput } from "../parser.js"
import { Fragment, Str } from "./index.js"
import { strDef } from "./str.js"

export namespace Optional {
    export type Definition<
        Def extends Fragment.Definition = Fragment.Definition
    > = `${Def}?`
}

export const optional = createNode({
    type: {} as Optional.Definition,
    parent: strDef,
    matches: ({ definition }) => definition.endsWith("?")
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
