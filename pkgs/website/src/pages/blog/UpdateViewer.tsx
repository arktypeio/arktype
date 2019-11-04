import React, { useState } from "react"
import {
    Card,
    Column,
    DatePicker,
    ErrorText,
    Text,
    Row
} from "@re-do/components"
import { Update } from "./Update"
import { updates } from "./content"
import { dateToString } from "./common"

type UpdateForDateProps = {
    date: Date
}

const UpdateForDate = (props: UpdateForDateProps) => {
    const yesterday = updates.find(currentUpdate => {
        const dayBeforeSelected = new Date()
        dayBeforeSelected.setDate(props.date.getDate() - 1)
        return (
            dateToString(currentUpdate.date) === dateToString(dayBeforeSelected)
        )
    })
    const today = updates.find(
        currentUpdate =>
            dateToString(props.date) === dateToString(currentUpdate.date)
    )
    return <Update yesterday={yesterday} today={today} />
}

export const UpdateViewer = () => {
    const [date, setDate] = useState(new Date())
    return (
        <Card style={{ padding: 16, width: "100%" }}>
            <Row align="baseline">
                <Text variant="h4" color="primary" style={{ paddingRight: 24 }}>
                    Daily Progress
                </Text>
                <DatePicker date={date} setDate={setDate} />
            </Row>
            <UpdateForDate date={date} />
        </Card>
    )
}
