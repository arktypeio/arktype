import { type } from "arktype"

class Cat {}
class Bird {}

export const Pet = type.instanceOf(Cat).or(type.instanceOf(Bird))
