import { ParseTypeOptions } from "./parse.js"

// Allow a user to extract types from arbitrary chains of properties
export const typeDefProxy: any = new Proxy({}, { get: () => getTypeDefProxy() })
export const getTypeDefProxy = () => typeDefProxy

export type ParseConfig = Required<ParseTypeOptions>
