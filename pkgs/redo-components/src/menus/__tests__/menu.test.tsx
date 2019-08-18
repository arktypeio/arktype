import React from "react"
import { mount, configure, ReactWrapper } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import { Menu, MenuItem } from ".."
import { Button } from "../../buttons"

configure({ adapter: new Adapter() })

const options = {
    option1: jest.fn(),
    option2: jest.fn()
}

let element: ReactWrapper

const createClickButton = (element: ReactWrapper) => () =>
    element.find(Button).simulate("click")

let clickButton: ReturnType<typeof createClickButton>

let clickMenuItem: ReturnType<typeof createClickMenuItem>

let clickBackground: ReturnType<typeof createClickBackground>

const createClickMenuItem = (element: ReactWrapper) => (index: number) =>
    element
        .find(MenuItem)
        .at(index)
        .simulate("click")

const createClickBackground = (element: ReactWrapper) => () =>
    element.find("#root").simulate("click")

const expectLength = (length: number) =>
    expect(element.find(MenuItem).length).toBe(length)

describe("menu", () => {
    beforeEach(() => {
        element = mount(
            <div id="root">
                <Menu>
                    {{
                        toggle: <Button>Open</Button>,
                        options
                    }}
                </Menu>
            </div>
        )
        clickButton = createClickButton(element)
        clickMenuItem = createClickMenuItem(element)
        clickBackground = createClickBackground(element)
    })

    test("closed by default", () => {
        expectLength(0)
    })
    test("example", () => {
        clickButton()
        clickMenuItem(0)
    })
    test("opens when clicked", () => {
        clickButton()
        expect(element.find(MenuItem).length).toBeGreaterThan(0)
    })
    test("closes when clicked away", () => {
        clickButton()
        clickBackground()
        expectLength(0)
    })
    test("displays all options", () => {
        clickButton()
        expect(element.find(MenuItem).length).toBe(Object.keys(options).length)
    })
    test("each option responds to click", () => {
        clickButton()
        Object.values(options).forEach((option, clickIndex, allOptions) => {
            clickMenuItem(clickIndex)

            expect(
                allOptions.every(
                    (option, validateIndex) =>
                        option.mock.calls.length ===
                        (validateIndex <= clickIndex ? 1 : 0)
                )
            ).toBe(true)
        })
    })
    test("closes after option click", () => {
        clickButton()
        clickMenuItem(0)

        expectLength(0)
    })
})
