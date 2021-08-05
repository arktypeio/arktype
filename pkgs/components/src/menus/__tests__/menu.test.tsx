import React from "react"
import { mount, ReactWrapper } from "enzyme"
import { Button } from "../../buttons"
import { TogglableMenu, Menu, MenuItem } from ".."

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
    element.find(MenuItem).at(index).simulate("click")

const getVisibleOptionCount = () => element.find(MenuItem).length

describe("menu", () => {
    beforeEach(() => {
        element = mount(
            <TogglableMenu toggle={<Button>Open</Button>} options={options} />
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
        Object.values(options).forEach((option, clickIndex, allOptions) => {
            clickButton()
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
        expect(element.find(Menu).props().open).toBe(true)
        clickMenuItem(0)
        expect(element.find(Menu).props().open).toBe(false)
    })
})
