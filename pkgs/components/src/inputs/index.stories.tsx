import React from "react"
import { TextInput, TextInputProps, ChipInput } from "."

export default {
    title: "Inputs"
}

export const Text = (props: TextInputProps) => (
    <TextInput label="example" {...props} />
)

Text.argTypes = {
    kind: { control: { type: "radio", options: ["outlined", "underlined"] } }
}

export const Chip = () => (
    <ChipInput onChange={(value) => console.log(value)} label="State" />
)

export const ChipWithAutosuggest = () => (
    <ChipInput label="State" possibleSuggestions={getStates()} />
)

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
