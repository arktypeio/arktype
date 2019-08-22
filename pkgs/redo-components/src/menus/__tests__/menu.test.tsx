import React from "react"
import { mount, ReactWrapper } from "enzyme"
import { Menu, MenuItem } from ".."
import { Button } from "../../buttons"

const options = {
    option1: jest.fn(),
    option2: jest.fn()
}

let element: ReactWrapper

const createClickButton = (element: ReactWrapper) => () =>
    element.find(Button).simulate("click")

let clickButton: ReturnType<typeof createClickButton>

let clickMenuItem: ReturnType<typeof createClickMenuItem>

const createClickMenuItem = (element: ReactWrapper) => (index: number) =>
    element
        .find(MenuItem)
        .at(index)
        .simulate("click")

const getVisibleOptionCount = () => element.find(MenuItem).length

describe("menu", () => {
    beforeEach(() => {
        element = mount(
            <Menu>
                {{
                    toggle: <Button>Open</Button>,
                    options
                }}
            </Menu>
        )
        clickButton = createClickButton(element)
        clickMenuItem = createClickMenuItem(element)
    })

    test("closed by default", () => {
        expect(getVisibleOptionCount()).toBe(0)
    })
    test("opens when clicked", () => {
        clickButton()
        expect(element.find(MenuItem).length).toBeGreaterThan(0)
    })
    test("displays all options", () => {
        clickButton()
        const menuItems = element.find(MenuItem)
        const expectedOptions = Object.keys(options)
        expect(menuItems.length).toBe(expectedOptions.length)
        menuItems.forEach((item, index) => {
            expect(item.text()).toBe(expectedOptions[index])
        })
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
        expect(getVisibleOptionCount()).toBe(0)
    })
})
