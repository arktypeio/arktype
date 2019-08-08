import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { Tree } from "."

const src = {
    z: "stuff",
    a: 33,
    b: {
        c: true,
        d: {
            e: () => {
                console.log(3)
            },
            f: {
                g: {
                    h: {
                        i: { j: { k: "h" } }
                    }
                }
            }
        }
    }
}

storiesOf("TreeView", module)
    .addDecorator(withTheme())
    .add("Input as array of test data", () => (
        <Tree style={{ width: 200 }} labelKey="z" from={[src]} />
    ))
    .add("Input as single object of test data", () => (
        <Tree style={{ width: 200 }} from={src} />
    ))


