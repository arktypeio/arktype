import React from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { Tree } from "."
import { Column } from "../layouts"
import { DisplayAs } from "../displayAs"
import { Button } from "../buttons"

const src = {
    browserEvent: "stuff",
    tag: 33,
    test: {
        tag: true,
        browserEvent: {
            tag: () => {
                console.log(3)
            },
            tags: [
                { name: "tag" },
                { name: "3g" },
                { name: "dfph" },
                { name: "dwpj" },
                { name: "4jj" }
            ],

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
        <Tree labelKey="browserEvent">{[src]}</Tree>
    ))
    .add("Input as single object of test data", () => <Tree>{src}</Tree>)
    .add("Input with static nodeExtras", () => (
        <Tree
            nodeExtras={<Button onClick={() => console.log("Hey, world!")} />}
        >
            {src}
        </Tree>
    ))
    .add("Input with context-aware nodeExtras", () => (
        <Tree
            nodeExtras={(key, value) => (
                <Button onClick={() => console.log(`${key}: ${value}`)} />
            )}
        >
            {src}
        </Tree>
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
