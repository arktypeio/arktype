// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "../../src/main.js"

type("(boolean | number | 'foo')[]")

const creditCard = type(
    "/^(?:4[0-9]{12}(?:[0-9]{3,6})?|5[1-5][0-9]{14}|(222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|6(?:011|5[0-9][0-9])[0-9]{12,15}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35d{3})d{11}|6[27][0-9]{14}|^(81[0-9]{14,17}))$/"
)

type({
    a: "string|number"
})

type(["string|number", "[]"])

const a = "string"
const b = "boolean"
const c = "number"

const t = type(a).and(b).and(c)
const z = {
    a: true
}

const factor = (s: string) => s

// not highlighted
factor("foo|bar")
// not highglighted
or("foo|bar")

const ff = type("string").or("foobar|baz")

const types = scope({ notASpace: { a: type("string") } }).export()
attest(types.notASpace).typed as Type<{ a: string }, Ark>

test("type definition", () => {
    const types = scope({ a: type("string") }).export()
    attest(types.a.infer).typed as string
    attest(() =>
        // @ts-expect-error
        scope({ a: type("strong") })
    ).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
})

const $ = scope({
    b: "3.14",
    a: () => $.type("number").morph((data) => `${data}`),
    aAndB: () => $.type("a&b"),
    bAndA: () => $.type("b&a")
})

scope({
    // nested highlighting
    a: "string|number",
    b: [
        {
            nested: "a"
        }
    ]
})

{
    const type = (arg?: any) => {}
    type({
        foo: "string|number"
    })
    const obj = {
        type
    }
    obj.type({})
    // syntax should still be correctly highlighted
    const foo = {}

    const outer = (...args: any[]) => obj

    outer("ark", () => {
        const arkType = type({
            number: "number",
            negNumber: "number",
            maxNumber: "number",
            string: "string",
            longString: "string",
            boolean: "boolean",
            deeplyNested: {
                foo: "string",
                num: "number",
                bool: "boolean"
            }
        })
    }).type()
    const t = type(`${2}<Date<${4}`)

    const $ = scope({ a: "string" })
    const importer = $.scope({ b: "a" })

    const func = (f: any) => f
    const abc = func($.type("string"))
}

class F {
    static compile(rule: PropRule[]) {
        const named = rule.filter(isNamed)
        if (named.length === rule.length) {
            return this.compileNamed(named)
        }
        const indexed = rule.filter(isIndexed)
        return condition
    }
}

export const parseOperator = (s: DynamicStateWithRoot): void => {
    const lookahead = s.scanner.shift()
    return lookahead === ""
        ? s.finalize("")
        : lookahead === "["
        ? s.scanner.shift() === "]"
            ? s.setRoot(s.root.array())
            : s.error(incompleteArrayTokenMessage)
        : lookahead === "|" || lookahead === "&"
        ? s.pushRootToBranch(lookahead)
        : lookahead === ")"
        ? s.finalizeGroup()
        : Scanner.lookaheadIsFinalizing(lookahead, s.scanner.unscanned)
        ? s.finalize(lookahead)
        : isKeyOf(lookahead, comparatorStartChars)
        ? parseBound(s, lookahead)
        : lookahead === "%"
        ? parseDivisor(s)
        : lookahead === " "
        ? parseOperator(s)
        : s.error(writeUnexpectedCharacterMessage(lookahead))
}

// export type parseOperator<s extends StaticState> =
//     s["unscanned"] extends Scanner.shift<infer lookahead, infer unscanned>
//         ? lookahead extends "["
//             ? unscanned extends Scanner.shift<"]", infer nextUnscanned>
//                 ? state.setRoot<s, [s["root"], "[]"], nextUnscanned>
//                 : state.error<incompleteArrayTokenMessage>
//             : lookahead extends "|" | "&"
//             ? state.reduceBranch<s, lookahead, unscanned>
//             : lookahead extends ")"
//             ? state.finalizeGroup<s, unscanned>
//             : Scanner.lookaheadIsFinalizing<lookahead, unscanned> extends true
//             ? state.finalize<
//                   state.scanTo<s, unscanned>,
//                   lookahead & Scanner.FinalizingLookahead
//               >
//             : lookahead extends ComparatorStartChar
//             ? parseBound<s, lookahead, unscanned>
//             : lookahead extends "%"
//             ? parseDivisor<s, unscanned>
//             : lookahead extends Scanner.WhiteSpaceToken
//             ? parseOperator<state.scanTo<s, unscanned>>
//             : state.error<writeUnexpectedCharacterMessage<lookahead>>
//         : state.finalize<s, "">

// This is used to generate highlighting.png
const highlighted = type({
    literals: "'foo' | 'bar' | true",
    expressions: "boolean[] | 5 < number <= 10 | number % 2",
    regex: "/^(?:4[0-9]{12}(?:[0-9]{3,6}))$/"
})
