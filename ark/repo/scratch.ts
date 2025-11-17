declare const snippet: string

import { type } from "arktype"

const htmlTag = type("z/^<(?<tag>[a-zA-Z]+)>.*?<\\/\\k<tag>>$/")

// match opening and closing html tags
const matches = htmlTag.exec(snippet)

if (matches) {
	console.log(matches.groups.tag)
}
