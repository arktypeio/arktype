declare const snippet: string

import { type } from "arktype"

type Z<T> = { [k in keyof T]?: T[k] }

type R = Z<{ a?: string }>

const htmlTag = type({
	html: "/^<(?<tag>[a-zA-Z]+)>.*?<\\/\\k<tag>>$/"
})

const t = /.*/.exec("")!

t.groups
