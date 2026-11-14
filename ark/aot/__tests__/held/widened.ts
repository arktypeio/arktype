import { type } from "arktype"
import { Dog } from "./classes.ts"

class Puppy extends Dog {}
const PuppyT = type.instanceOf(Puppy)

// arktype keeps only Puppy while it extends Dog, and throws once it doesn't
export const Widened = type.instanceOf(Dog).and(PuppyT)
