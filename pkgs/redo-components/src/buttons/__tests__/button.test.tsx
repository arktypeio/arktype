import React from "react"
import { shallow } from "enzyme"
import { Button } from ".."

test("Button gets clicked", () => {
    const onClick = jest.fn()
    const element = shallow(<Button onClick={onClick}>Click me!</Button>)
    element.simulate("click")
    expect(onClick).toBeCalled()
})
