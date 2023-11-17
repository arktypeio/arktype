import { fromHere } from "@arktype/fs"
import { join } from "path"

const root = fromHere("..", "..")
const packages = join(root, "ark")
const docs = join(packages, "docs")

export const repoDirs = {
	root,
	packages,
	docs,
	repo: join(packages, "repo")
}
