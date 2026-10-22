import { isLong } from "./holes.ts"

// as a mock with another parameter count would
Object.defineProperty(isLong, "length", { value: 2 })
