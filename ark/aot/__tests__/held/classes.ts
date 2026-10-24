import { type } from "arktype"

export class Animal {}
export class Dog extends Animal {}

export const AnimalT = type.instanceOf(Animal)
