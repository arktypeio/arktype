import React from "react"
import { withKnobs, select } from "@storybook/addon-knobs"
import { storiesOf } from "@storybook/react"
import { TextInput, ChipInput } from "."

storiesOf("Input", module)
    .addDecorator(withKnobs)
    .add("Text", () => (
        <TextInput
            kind={select(
                "kind",
                { outlined: "outlined", underlined: "underlined" },
                "outlined"
            )}
        />
    ))
    .add("Chip", () => <ChipInput label="State" />)
    .add("Chip with Autosuggest", () => (
        <ChipInput label="State" possibleSuggestions={getStates()} />
    ))

const getStates = () => [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming"
]
