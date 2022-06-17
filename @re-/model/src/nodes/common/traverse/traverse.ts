export namespace Traverse {
    export type Context<Cfg> = {
        path: string
        seen: string[]
        shallowSeen: string[]
        modelCfg: Cfg
    }

    export const createContext = <Cfg>(modelOptions: Cfg): Context<Cfg> => {
        return {
            path: "",
            seen: [],
            shallowSeen: [],
            modelCfg: modelOptions
        }
    }

    // export abstract class Traversal<Cfg> {
    //     private ctxStack: Context[]

    //     constructor(public readonly cfg: Cfg) {
    //         this.ctxStack = [
    //             {
    //                 path: "",
    //                 seen: [],
    //                 shallowSeen: []
    //             }
    //         ]
    //     }

    //     get ctx() {
    //         return this.ctxStack.at(-1)!
    //     }

    //     visit(node: Parser.Node, ctxUpdates?: Partial<Context>) {
    //         if (ctxUpdates) {
    //             this.ctxStack.push({ ...this.ctx, ...ctxUpdates })
    //         }
    //         return this.ctxStack.pop()
    //     }
    // }
}
