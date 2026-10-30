import { type } from "arktype"
import { AnimalT, Dog } from "./classes.ts"

class Puppy extends Dog {}

// arktype keeps only Puppy while it extends Animal, and throws once it doesn't
export const Narrowed = type.instanceOf(Puppy).and(AnimalT)
