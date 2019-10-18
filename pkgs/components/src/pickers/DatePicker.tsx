import React, { Dispatch, SetStateAction } from "react"
import DateFnsUtils from "@date-io/date-fns"
import {
    MuiPickersUtilsProvider,
    DatePicker as MuiDatePicker
} from "@material-ui/pickers"

export type DatePickerProps = {
    date: Date
    setDate: Dispatch<SetStateAction<Date>>
}

export const DatePicker = ({ date, setDate }: DatePickerProps) => {
    return (
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <MuiDatePicker value={date} onChange={setDate as any} />
        </MuiPickersUtilsProvider>
    )
}
