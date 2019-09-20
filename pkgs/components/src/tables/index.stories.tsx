import React from "react"
import { storiesOf } from "@storybook/react"
import { Table } from "."

storiesOf("ResultsTable", module).add("Standard", () => {
    return (
        <Table
            columns={[
                { title: "Adı", field: "name" },
                { title: "Soyadı", field: "surname" },
                {
                    title: "Doğum Yılı",
                    field: "birthYear",
                    type: "numeric"
                },
                {
                    title: "Doğum Yeri",
                    field: "birthCity",
                    lookup: { 34: "İstanbul", 63: "Şanlıurfa" }
                }
            ]}
            data={[
                {
                    name: "Mehmet",
                    surname: "Baran",
                    birthYear: 1987,
                    birthCity: 63
                }
            ]}
            title="Demo Title"
        />
    )
})
