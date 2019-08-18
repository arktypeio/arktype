import React from "react"
import { mount, configure } from "enzyme"
import Adapter from "enzyme-adapter-react-16"
import { Menu } from ".."
import { Button } from "../../buttons"

configure({ adapter: new Adapter() })

test("Menu gets clicked", () => {
    const onClick = jest.fn()
    const option1 = jest.fn()
    const option2 = jest.fn()
    const children = {
        toggle: <Button id="divID">Open menu</Button>,
        options: {
            firstOption: option1(),
            secondOption: option2()
        }
    }
    const element = mount(
        <div>
            <Menu id="menuID" onClick={onClick}>
                {children}
            </Menu>
        </div>
    )
    const thing = element.find("#menuID")
    console.log(thing)
    element.find("#menuID").simulate("click")
    expect(onClick).toBeCalled()
    //element.find("MenuItem").simulate("click")
    //expect(option1).toBeCalled()
})
