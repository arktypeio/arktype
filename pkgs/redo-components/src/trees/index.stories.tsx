import React, { FC, useState } from "react"
import { storiesOf } from "@storybook/react"
import { withTheme } from "../storybook"
import { TreeView } from "./TreeView"

storiesOf("TreeView", module)
    .addDecorator(withTheme())
    .add("Basic View", () => (
        <TreeView
            style={{ width: 200 }}
            from={{
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
            }}
        />
    ))
