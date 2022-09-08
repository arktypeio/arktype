export type Segment = string | number
export type Path = Segment[]

export type Context<Cfg> = {
    path: Path
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
