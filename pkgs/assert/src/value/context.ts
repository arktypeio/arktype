import { SourceRange, withCallRange } from "@re-do/node"
import { Func } from "@re-do/utils"

export type ValueContext<T> = T extends Func
    ? T & {
          returns: T
          throws: (...args: Parameters<T>) => string | undefined
      }
    : () => T

export const valueContext = (range: SourceRange, value: any) => {
    const getValue = () => value
    if (typeof value !== "function") {
        return getValue
    }
    const functionProps: Partial<ValueContext<Func>> = {
        returns: (...args: any[]) => value(...args),
        throws: (...args: any[]) => {
            try {
                value(...args)
            } catch (e) {
                return String(e)
            }
        }
    }
    return Object.assign(getValue, functionProps)
}
