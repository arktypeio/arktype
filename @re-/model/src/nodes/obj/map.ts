import { diffSets, Entry, Evaluate } from "@re-/tools"
import { Root } from "../root.js"
import { Optional } from "../str/index.js"
import { BaseNode, BaseNodeClass } from "#node"

export namespace Map {
    export type Parse<
        Def,
        Dict,
        Seen,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends Optional.Definition ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            -readonly [K in RequiredKey]: Root.Parse<Def[K], Dict, Seen>
        } & {
            -readonly [K in OptionalKey]?: Root.Parse<Def[K], Dict, Seen>
        }
    >
    export const Node: BaseNodeClass<
        object,
        object
    > = class extends BaseNode<object> {
        // We don't need any extra validation besides Obj's match function
        static matches(def: object): def is object {
            return true
        }

        props() {
            return Object.entries(this.def).map(([prop, propDef]) => [
                prop,
                Root.Node.parse(propDef, {
                    ...this.ctx,
                    path: [...this.ctx.path, prop],
                    shallowSeen: []
                })
            ]) as Entry<string, BaseNode<unknown>>[]
        }

        validate(value: unknown) {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                return false
            }
            const keyDiff = diffSets(Object.keys(this.def), Object.keys(value))
            if (keyDiff) {
                return false
            }
            return this.props().every(([prop, node]) =>
                node.validate((value as any)[prop])
            )
        }

        generate() {
            return Object.fromEntries(
                this.props().map(([prop, node]) => [prop, node.generate()])
            )
        }
    }
}
