import { type Type, type } from "arktype";

import type { ProductData } from "#src";

const image = type({
  id: "number",
  created: "Date",
  title: "1<=string<=100",
  type: "'jpg'|'png'",
  size: "number",
  url: "string.url",
});

const rating = type({
  id: "number",
  stars: "1<=number<=5",
  title: "1<=string<=100",
  text: "1<=string<=1000",
  images: image.array(),
});

const product = type({
  id: "number",
  created: "Date",
  title: "1<=string<=100",
  brand: "1<=string<=30",
  description: "1<=string<=500",
  price: "1<=number<=10000",
  discount: "1<=number<=100|null",
  quantity: "0<=number<=10",
  tags: "(1<=string<=30)[]",
  images: image.array(),
  ratings: rating.array(),
}) satisfies Type<ProductData>;

product({});
