import { type } from "arktype"

class Bird {}

const Cats = type.instanceOf(class Cat {})

// branches sort by class name, as the factory sorts what it receives
export const Pet = Cats.or(type.instanceOf(Bird))
