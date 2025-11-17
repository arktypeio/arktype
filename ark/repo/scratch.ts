declare const snippet: string

import { type } from "arktype"

const htmlTag = type("z/^<(?<tag>[a-zA-Z]+)>.*?<\\/\\k<tag>>$/")
