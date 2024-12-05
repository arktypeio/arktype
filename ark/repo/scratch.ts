import { flatMorph } from "@ark/util"
import { ark, type } from "arktype"

const name = type("string.numeric.parse").brand("foo")

const something = name.from("")
