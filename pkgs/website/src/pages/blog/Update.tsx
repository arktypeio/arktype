import React from "react"
import { Text, Row, Column, ErrorText } from "@re-do/components"
import { UpdateData } from "./common"

export type UpdateProps = {
    yesterday?: UpdateData
    today?: UpdateData
}

const listGoals = (goals: Record<string, boolean>) =>
    Object.entries(goals).map(([description, completed]) => (
        <Text key={description}>{`${
            completed ? "✔️" : "❌"
        } ${description}`}</Text>
    ))

const noUpdate = <ErrorText>There was no update on this day</ErrorText>

export const Update = ({ yesterday, today }: UpdateProps) => (
    <Row style={{ padding: 16 }}>
        <Column>
            <Text>
                <b>Yesterday</b>
            </Text>
            {yesterday ? listGoals(yesterday.goals) : noUpdate}
        </Column>
        <Column>
            <Text>
                <b>Today</b>
            </Text>
            {today ? listGoals(today.goals) : noUpdate}
        </Column>
    </Row>
)
