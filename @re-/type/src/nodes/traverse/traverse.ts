import type { Path } from "../common.js"

export type TraverseContext<Cfg> = {
    path: Path
    seen: string[]
    modelCfg: Cfg
}

// TODO: State based traversal?
export const createTraverseContext = <Cfg>(
    modelOptions: Cfg
): TraverseContext<Cfg> => {
    return {
        path: [],
        seen: [],
        modelCfg: modelOptions
    }
}
