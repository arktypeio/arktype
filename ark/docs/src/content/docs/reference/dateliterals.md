---
title: Date Literals
sidebar:
  order: 5
---

<!--
Date literals

Date literals can now be defined using the following syntax:

```ts
// single or double quoted string preceded by "d"
// enclosed string is passed to the Date constructor
const exactDate = type("d'2023-07-04'")
```

This is mostly useful in the context of ranges, where they can be applies as limits to a non-literal `Date` (normal rules about comparators and single/double bounds apply):

```ts
// a Date after 2000 but before 2010
const dateInRange = type("d'2000'<Date<=d'2010-1-1'")
```

Since what is enclosed by the date literal tokens is not parsed, you can also insert values dynamically, e.g.:

```ts
// a Date in the past
const  = type(`Date<=d"${Date.now()}"`)
``` -->
