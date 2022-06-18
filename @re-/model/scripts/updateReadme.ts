import { reTag, updateMarkdownTags } from "@re-/node"

const data = reTag({ include: ["./demos/**"] })

await updateMarkdownTags({ data })
