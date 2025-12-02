import { ArkErrors, type } from "arktype"
import * as v from "valibot"
import z from "zod"

const isParsableDate = (s: string) => !Number.isNaN(new Date(s).valueOf())
