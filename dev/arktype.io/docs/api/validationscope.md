---
hide_table_of_contents: true
---

# validationScope

## text

| Name          | Type                       | Description                  |
| ------------- | -------------------------- | ---------------------------- |
| alpha         | ` string`                  | only letters                 |
| alphanumeric  | ` string`                  | only letters and digits      |
| lowercase     | ` string`                  | only lowercase letters       |
| uppercase     | ` string`                  | only uppercase letters       |
| creditCard    | ` string`                  | a valid credit card number   |
| email         | ` string`                  | a valid email                |
| uuid          | ` string`                  | a valid UUID                 |
| parsedNumber  | ` (In: string) => number`  | a well-formed numeric string |
| parsedInteger | ` (In: string) => number`  | a well-formed integer string |
| parsedDate    | ` (In: string) => Date`    | a valid date                 |
| semver        | ` string`                  | a valid semantic version     |
| json          | ` (In: string) => unknown` | a JSON-parsable string       |
| integer       | ` number`                  | an integer                   |
