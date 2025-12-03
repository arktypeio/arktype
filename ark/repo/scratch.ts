import { regex } from "arkregex"

const S = regex("^a(?<foo>b(c)d)?e\\1\\2?$")

S
