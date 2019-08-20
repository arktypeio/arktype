import React from "react"
import { shallow, configure } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import { Button } from ".."

configure({ adapter: new Adapter() })

test("Button gets clicked", () => {
    const onClick = jest.fn()
    const element = shallow(<Button onClick={onClick}>Click me!</Button>)
    element.simulate("click")
    expect(onClick).toBeCalled()
})
