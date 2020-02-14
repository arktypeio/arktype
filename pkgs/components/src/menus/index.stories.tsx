import React, { useRef } from "react"
import { storiesOf } from "@storybook/react"
import { Button } from "../buttons"
import { Menu, TogglableMenu } from "."
import { withKnobs, boolean as booleanKnob } from "@storybook/addon-knobs"

storiesOf("Menu", module)
    .addDecorator(withKnobs)
    .add("ToggleMenu", () => (
        <TogglableMenu>
            {{
                toggle: <Button>Open</Button>,
                options: {
                    Logout: () => console.log("out"),
                    Login: () => console.log("in")
                }
            }}
        </TogglableMenu>
    ))
    .add("Menu", () => {
        const anchorTo = useRef<HTMLDivElement>(null)
        return (
            <div>
                <div ref={anchorTo}>Anchored here</div>
                <Menu>
                    {{
                        anchorTo,
                        open: booleanKnob("open", true),
                        options: {
                            Logout: () => console.log("out"),
                            Login: () => console.log("in")
                        }
                    }}
                </Menu>
            </div>
        )
    })
