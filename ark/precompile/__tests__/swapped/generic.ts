import { ArrayOf } from "./containers.ts"

// a mock can swap it for another Generic whose body is a class, which nothing but identity tells apart
export const Arrayed = ArrayOf("string")
