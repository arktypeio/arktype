import { flatMorph } from "@ark/util"
import { ark, type } from "arktype"

console.log(flatMorph(ark.internal.resolutions, (k, v) => [k, v.description]))
