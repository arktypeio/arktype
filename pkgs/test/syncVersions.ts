import { fromHere, readJson, writeJson } from "@re-do/node"

const version = readJson(fromHere("package.json")).version
const appPackageJson = fromHere("..", "app", "package.json")
const websitePackageJson = fromHere("..", "website", "package.json")

writeJson(appPackageJson, { ...readJson(appPackageJson), version })
writeJson(websitePackageJson, { ...readJson(websitePackageJson), version })
