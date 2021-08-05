import { StepKinds } from "../common.js"
import { click } from "./click.js"
import { go } from "./go.js"
import { screenshot } from "./screenshot.js"
import { set } from "./set.js"
import { assertText } from "./assertText.js"

export type { Step } from "@re-do/model"

export const defaultStepKinds: StepKinds = {
    click,
    go,
    set,
    screenshot,
    assertText
}
