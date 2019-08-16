import React from "react"
import { shallow, configure } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import { Button } from ".."

configure({ adapter: new Adapter() })

test("Button gets clicked", () => {
    const onClick = jest.fn()
    const element = shallow(
        <div>
            <Button onClick={onClick}>Click me!</Button>
        </div>
    )
    console.log(element)
    element.find(Button).simulate("click")
    expect(onClick).toBeCalled()
})
