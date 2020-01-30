import React from "react"
import { storiesOf } from "@storybook/react"
import { Button } from "../buttons"
import { Menu } from "."
import { withKnobs, boolean as booleanKnob } from "@storybook/addon-knobs"

storiesOf("Menu", module)
    .addDecorator(withKnobs)
    .add("Basic", () => (
        <Menu>
            {{
                toggle: <Button>Open</Button>,
                options: {
                    Logout: () => console.log("out"),
                    Login: () => console.log("in")
                }
            }}
        </Menu>
    ))

    .add("No Button", () => (
        <Menu open={booleanKnob("open", true)}>
            {{
                options: {
                    Logout: () => console.log("out"),
                    Login: () => console.log("in")
                }
            }}
        </Menu>
    ))
