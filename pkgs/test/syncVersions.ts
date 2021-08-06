import { version } from "./package.json"
import { fromHere, readJson, writeJson } from "@re-do/node-utils"

const appPackageJson = fromHere("..", "app", "package.json")
const websitePackageJson = fromHere("..", "website", "package.json")

writeJson(appPackageJson, { ...readJson(appPackageJson), version })
writeJson(websitePackageJson, { ...readJson(appPackageJson), version })
