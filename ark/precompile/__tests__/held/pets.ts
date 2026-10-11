import { type } from "arktype"

class Bird {}

const Cats = type.instanceOf(class Cat {})

// arktype sorts the branches by their classes' names, which the factory sorts the classes it receives by too
export const Pet = Cats.or(type.instanceOf(Bird))
