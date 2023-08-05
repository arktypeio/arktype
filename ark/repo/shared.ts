import { join } from "path"
import { fromHere } from "@arktype/fs"

const root = fromHere("..", "..")
const packages = join(root, "ark")
const docs = join(packages, "docs")

export const repoDirs = {
	root,
	packages,
	docs,
	repo: join(packages, "repo")
}
