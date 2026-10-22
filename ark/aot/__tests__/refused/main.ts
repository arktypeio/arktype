import "./config.ts"
import { type } from "arktype"

const meta = { title: "Zahl", label: () => "eine Zahl" }

export const T = type("number").configure(meta)
