export namespace Traverse {
    export type Context = {
        path: string
        seen: string[]
        shallowSeen: string[]
    }

    export const createContext = (): Context => {
        return {
            path: "",
            seen: [],
            shallowSeen: []
        }
    }

    export class Traversal<Ctx extends Context, Cfg> {
        constructor(public ctx: Ctx, public readonly cfg: Cfg) {}
    }
}
