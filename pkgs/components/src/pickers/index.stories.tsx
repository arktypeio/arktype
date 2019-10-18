import React, { useState } from "react"
import { storiesOf } from "@storybook/react"
import { DatePicker } from "."

storiesOf("Pickers", module).add("DatePicker", () => <ExampleDatePicker />)

const ExampleDatePicker = () => {
    const [date, setDate] = useState(new Date())
    return <DatePicker date={date} setDate={setDate} />
}
