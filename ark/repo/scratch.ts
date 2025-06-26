import { type } from "arktype"

type("string").extends("string | number") // true
type("string | number").extends("string") // false
