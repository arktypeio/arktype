import { Parser } from "../parse.js"

export namespace Traverse {
    export type Context = {
        path: string
        seen: string[]
        shallowSeen: string[]
    }

    export const createContext = <Extensions>(
        extensions: Extensions
    ): Context & Extensions => {
        return {
            path: "",
            seen: [],
            shallowSeen: [],
            ...extensions
        }
    }

    export abstract class Traversal<Ctx extends Context, Cfg> {
        private ctxStack: Ctx[]
        constructor(ctx: Ctx, public readonly cfg: Cfg) {
            this.ctxStack = [ctx]
        }

        get ctx() {
            return this.ctxStack.at(-1)!
        }

        visit(node: Parser.Node, ctxUpdates?: Partial<Ctx>) {
            if (ctxUpdates) {
                this.ctxStack.push({ ...this.ctx, ...ctxUpdates })
            }
            this.onVisit(node)
            return this.ctxStack.pop()
        }

        abstract onVisit(node: Parser.Node): unknown
    }
}
