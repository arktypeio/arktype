export type TraversalContext<Cfg> = {
    path: string
    seen: string[]
    modelCfg: Cfg
}

export const createTraversalContext = <Cfg>(
    modelOptions: Cfg
): TraversalContext<Cfg> => {
    return {
        path: "",
        seen: [],
        modelCfg: modelOptions
    }
}
