export type Context<Cfg> = {
    path: string[]
    seen: string[]
    modelCfg: Cfg
}

// TODO: State based traversal?
export const createContext = <Cfg>(modelOptions: Cfg): Context<Cfg> => {
    return {
        path: [],
        seen: [],
        modelCfg: modelOptions
    }
}
