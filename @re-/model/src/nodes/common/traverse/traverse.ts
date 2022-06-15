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

    export class Traversal<Cfg> {
        ctx: Context
        constructor(public readonly cfg: Cfg) {
            this.ctx = createContext()
        }
    }
}
