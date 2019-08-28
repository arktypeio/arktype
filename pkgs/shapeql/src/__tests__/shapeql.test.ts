import gql from "graphql-tag"
import { Root, initialRoot, initialRootWithTypeNames, A } from "./common"
import { shapeql, withTypeNames, rootQuery, RootQuery } from "../shapeql"

test("withTypeNames root", () => {
    const result = withTypeNames(initialRoot, Root)
    expect(result).toStrictEqual(initialRootWithTypeNames)
})

test("withTypeNames update", () => {
    const result = withTypeNames({ a: 0, b: { a: [] } }, A)
    expect(result).toStrictEqual({
        __typename: "A",
        a: 0,
        b: { __typename: "B", a: [] }
    })
})

test("rootQuery", () => {
    const result = rootQuery(Root)
    const expected: RootQuery<Root> = {
        a: {
            a: null,
            b: {
                a: null
            }
        },
        b: null,
        c: null,
        d: {
            a: null,
            b: {
                a: null
            }
        }
    }
    expect(result).toStrictEqual(expected)
})

test("shallow queries", () => {
    expect(shapeql(Root)({ b: null })).toEqual(
        gql`
            {
                b
            }
        `
    )
})
test("deep queries", () => {
    expect(shapeql(Root)({ a: null })).toEqual(
        gql`
            {
                a {
                    a
                    b {
                        a
                    }
                }
            }
        `
    )
})
test("deep nested queries", () => {
    expect(shapeql(Root)({ a: { b: null } })).toEqual(
        gql`
            {
                a {
                    b {
                        a
                    }
                }
            }
        `
    )
})
test("deep nested queries", () => {
    expect(shapeql(Root)({ a: { b: null } })).toEqual(
        gql`
            {
                a {
                    b {
                        a
                    }
                }
            }
        `
    )
})
test("this will always fail", () => {
    expect(true).toBeFalsy()
})
