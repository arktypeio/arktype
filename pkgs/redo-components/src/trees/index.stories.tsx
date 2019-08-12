import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { Tree } from "."
import { Column } from "../layouts"
import { DisplayAs } from "../displayAs"

const src = {
    browserEvent: "stuff",
    tag: 33,
    test: {
        tag: true,
        browserEvent: {
            tag: () => {
                console.log(3)
            },
            test: {
                test: {
                    test: {
                        tag: { tag: { tag: "h" } }
                    }
                }
            },
            test2: {
                test: {
                    tag: "h"
                }
            }
        }
    }
}

storiesOf("TreeView", module)
    .addDecorator(withTheme())
    .add("Input as array of test data", () => (
        <Tree
            displayAs={objectActions}
            style={{ width: 200 }}
            labelKey="browserEvent"
            from={[src]}
        />
    ))
    .add("Input as single object of test data", () => (
        <Tree displayAs={objectActions} style={{ width: 200 }} from={src} />
    ))

export const objectActions: Record<string, DisplayAs> = {
    test: {
        actions: ["run", "delete"]
    },
    browserEvent: {
        actions: ["delete", "modify"]
    },
    tag: {
        actions: ["delete", "View items with this tag"]
    }
}
