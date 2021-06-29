import { Step } from "@re-do/model"
import { Context } from "../common"
import { click } from "./click"
import { go } from "./go"
import { screenshot } from "./screenshot"
import { set } from "./set"

export type { Step } from "@re-do/model"

export const stepTypes = {
    click,
    go,
    set,
    screenshot
}

export const perform = async (
    { kind, ...args }: Step,
    context: Context
): Promise<any> => await stepTypes[kind](args as any, context)
