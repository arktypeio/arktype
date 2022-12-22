import type { domainOf, inferDomain } from "../../utils/domains.js"
import type { evaluate } from "../../utils/generics.js"

export type UnaryFunction<In = any, Return = unknown> = (In: In) => Return

export type distributable<f extends UnaryFunction> = f | distributeFunction<f>

type distributeFunction<f extends UnaryFunction> = f extends UnaryFunction<
    infer In,
    infer Return
>
    ? evaluate<{
          [domain in domainOf<In>]?: (
              In: unknown extends In
                  ? unknown
                  : Extract<In, inferDomain<domain>>
          ) => Return
      }>
    : never
