import React from "react"
import { mount, configure } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import { Menu, MenuItem } from ".."
import { Button } from "../../buttons"

configure({ adapter: new Adapter() })

describe("menu", () => {
    test("example", () => {
        const element = mount(
            <Menu>
                {{
                    toggle: <Button>Open</Button>,
                    options: {
                        Logout: () => console.log("out"),
                        Login: () => console.log("in")
                    }
                }}
            </Menu>
        )
        element.find(Button).simulate("click")
        element
            .find(MenuItem)
            .at(0)
            .simulate("click")
    })
    test("opens when clicked", () => {})
    test("closed by default", () => {})
    test("closes when clicked away", () => {})
    test("displays all options", () => {})
    test("each option responds to click", () => {})
    test("closes after option click", () => {})
})
