declare const snippet: string

import { regex } from "arkregex"

const htmlTag = regex("^<(?<tag>[a-zA-Z]+)>.*?</\\k<tag>>$")

// match opening and closing html tags
const matches = htmlTag.exec(snippet)

if (matches) {
	console.log(matches.groups.tag)
}
