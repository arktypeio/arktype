---
hide_table_of_contents: true
---

# validationScope

## keywords

-   keywords: { "alpha": "only letters", "alphanumeric": "only letters and digits", "lowercase": "only lowercase letters", "uppercase": "only uppercase letters", "creditCard": "a valid credit card number", "email": "a valid email", "uuid": "a valid UUID", "parsedNumber": "a well-formed numeric string", "parsedInteger": "a well-formed integer string", "parsedDate": "a valid date", "semver": "a valid semantic version", "json": "a JSON-parsable string", "integer": "an integer"}

## text

| Name          | Type                                                               | Description                  |
| ------------- | ------------------------------------------------------------------ | ---------------------------- |
| alpha         | ` string`                                                          | only letters                 |
| alphanumeric  | ` string`                                                          | only letters and digits      |
| lowercase     | ` string`                                                          | only lowercase letters       |
| uppercase     | ` string`                                                          | only uppercase letters       |
| creditCard    | ` string`                                                          | a valid credit card number   |
| email         | ` string`                                                          | a valid email                |
| uuid          | ` string`                                                          | a valid UUID                 |
| parsedNumber  | ` (In: string) => import("../../parse/ast/morph.js").Out<number>`  | a well-formed numeric string |
| parsedInteger | ` (In: string) => import("../../parse/ast/morph.js").Out<number>`  | a well-formed integer string |
| parsedDate    | ` (In: string) => import("../../parse/ast/morph.js").Out<Date>`    | a valid date                 |
| semver        | ` string`                                                          | a valid semantic version     |
| json          | ` (In: string) => import("../../parse/ast/morph.js").Out<unknown>` | a JSON-parsable string       |
| integer       | ` number`                                                          | an integer                   |
