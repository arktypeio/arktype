import { Root } from "./components"

export type UnvalidatedTypeSet = { [K in string]: Root.Definition }

export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDefProxy() })

export const getTypeDefProxy = () => typeDefProxy
