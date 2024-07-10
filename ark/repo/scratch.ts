import { type } from "arktype"

const dateFrom = type("parse.date | Date")

const fromString = dateFrom("05-21-1993")

const fromDate = dateFrom(new Date())
