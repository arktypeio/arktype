import { Project } from "ts-morph"
import { getUpdatedInstantiationCount } from "./bench/type.ts"
import { fromHere } from "./runtime/fs.ts"

const project = new Project()
project.addSourceFileAtPath(fromHere("./checkfile.ts"))

console.log(getUpdatedInstantiationCount(project))
