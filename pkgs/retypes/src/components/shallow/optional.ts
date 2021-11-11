import { typeDefProxy } from "../../common.js"
import { createNode, createParser, NodeInput } from "../parser.js"
import { Fragment, Str } from "./index.js"

export namespace Optional {
    export type Definition<
        Def extends Fragment.Definition = Fragment.Definition
    > = `${Def}?`

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: Str.node,
        matches: ({ definition }) => definition.endsWith("?"),
        implements: {
            allows: (args) => {
                if (args.assignment === "undefined") {
                    return {}
                }
                return Fragment.parser.allows({
                    ...args,
                    definition: args.definition.slice(0, -1)
                })
            },
            getDefault: () => undefined,
            references: (args) =>
                Fragment.parser.references({
                    ...args,
                    definition: args.definition.slice(0, -1)
                })
        }
    })

    export const parser = createParser(node)
}
