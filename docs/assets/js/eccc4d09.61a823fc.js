"use strict";(self.webpackChunkredo_dev=self.webpackChunkredo_dev||[]).push([[535],{9613:(e,t,n)=>{n.d(t,{Zo:()=>s,kt:()=>k});var a=n(9496);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function l(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},i=Object.keys(e);for(a=0;a<i.length;a++)n=i[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(a=0;a<i.length;a++)n=i[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var d=a.createContext({}),p=function(e){var t=a.useContext(d),n=t;return e&&(n="function"==typeof e?e(t):l(l({},t),e)),n},s=function(e){var t=p(e.components);return a.createElement(d.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},u=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,i=e.originalType,d=e.parentName,s=o(e,["components","mdxType","originalType","parentName"]),u=p(n),k=r,N=u["".concat(d,".").concat(k)]||u[k]||m[k]||i;return n?a.createElement(N,l(l({ref:t},s),{},{components:n})):a.createElement(N,l({ref:t},s))}));function k(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var i=n.length,l=new Array(i);l[0]=u;var o={};for(var d in t)hasOwnProperty.call(t,d)&&(o[d]=t[d]);o.originalType=e,o.mdxType="string"==typeof e?e:r,l[1]=o;for(var p=2;p<i;p++)l[p]=n[p];return a.createElement.apply(null,l)}return a.createElement.apply(null,n)}u.displayName="MDXCreateElement"},8430:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>g,contentTitle:()=>k,default:()=>y,frontMatter:()=>u,metadata:()=>N,toc:()=>c});var a=n(9613),r=Object.defineProperty,i=Object.defineProperties,l=Object.getOwnPropertyDescriptors,o=Object.getOwnPropertySymbols,d=Object.prototype.hasOwnProperty,p=Object.prototype.propertyIsEnumerable,s=(e,t,n)=>t in e?r(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n,m=(e,t)=>{for(var n in t||(t={}))d.call(t,n)&&s(e,n,t[n]);if(o)for(var n of o(t))p.call(t,n)&&s(e,n,t[n]);return e};const u={sidebar_position:5},k="Syntax",N={unversionedId:"syntax",id:"version-1.11.0/syntax",title:"Syntax",description:"@re-/model supports many of TypeScript's built-in types and operators, as well as some new ones dedicated exclusively to runtime validation. The following sections outline the kinds of definitions available to you when creating a model.",source:"@site/model_versioned_docs/version-1.11.0/syntax.mdx",sourceDirName:".",slug:"/syntax",permalink:"/model/syntax",draft:!1,tags:[],version:"1.11.0",sidebarPosition:5,frontMatter:{sidebar_position:5},sidebar:"defaultSidebar",previous:{title:"Constraints",permalink:"/model/constraints"},next:{title:"API",permalink:"/model/api"}},g={},c=[{value:"Objects",id:"objects",level:2},{value:"Map",id:"map",level:3},{value:"Tuple",id:"tuple",level:3},{value:"Strings",id:"strings",level:2},{value:"Keywords",id:"keywords",level:3},{value:"String subtypes",id:"string-subtypes",level:4},{value:"Number subtypes",id:"number-subtypes",level:4},{value:"Literals",id:"literals",level:3},{value:"Expressions",id:"expressions",level:3},{value:"Modifiers",id:"modifiers",level:3},{value:"Primitives",id:"primitives",level:2}],b={toc:c};function y(e){var t,n=e,{components:r}=n,s=((e,t)=>{var n={};for(var a in e)d.call(e,a)&&t.indexOf(a)<0&&(n[a]=e[a]);if(null!=e&&o)for(var a of o(e))t.indexOf(a)<0&&p.call(e,a)&&(n[a]=e[a]);return n})(n,["components"]);return(0,a.kt)("wrapper",(t=m(m({},b),s),i(t,l({components:r,mdxType:"MDXLayout"}))),(0,a.kt)("h1",m({},{id:"syntax"}),"Syntax"),(0,a.kt)("p",null,(0,a.kt)("inlineCode",{parentName:"p"},"@re-/model")," supports many of TypeScript's built-in types and operators, as well as some new ones dedicated exclusively to runtime validation. The following sections outline the kinds of definitions available to you when creating a model."),(0,a.kt)("p",null,"If there's a type or expression you wish were supported but isn't, we'd love for you to ",(0,a.kt)("a",m({parentName:"p"},{href:"https://github.com/re-do/re-po/issues/new"}),"create a feature request!")," Our parser is easy to extend, so you might just see it an upcoming release \ud83c\udf81"),(0,a.kt)("h2",m({},{id:"objects"}),"Objects"),(0,a.kt)("p",null,"Object definitions are sets of keys or indices corresponding to string, literal, or nested object definitions."),(0,a.kt)("h3",m({},{id:"map"}),"Map"),(0,a.kt)("p",null,"Map definitions are represented using the familiar object literal syntax."),(0,a.kt)("pre",null,(0,a.kt)("code",m({parentName:"pre"},{className:"language-ts"}),'import { create } from "@re-/model"\n\nconst foo = create({\n    key: "string?",\n    anotherKey: ["unknown", { re: "\'model\'|\'state\'|\'test\'" }]\n})\n\n// Equivalent TS\ntype FooToo = {\n    key?: string\n    anotherKey: [\n        unknown,\n        {\n            re: "model" | "state" | "test"\n        }\n    ]\n}\n')),(0,a.kt)("h3",m({},{id:"tuple"}),"Tuple"),(0,a.kt)("p",null,"Tuple definitions are useful for fixed-length lists and are represented as array literals."),(0,a.kt)("pre",null,(0,a.kt)("code",m({parentName:"pre"},{className:"language-ts"}),'import { create } from "@re-/model"\n\nconst bar = create([\n    "true|null",\n    { coords: ["number", "number"], piOus: [3, 1, 4] }\n])\n\n// Equivalent TS\ntype BarAgain = [\n    true | null,\n    {\n        coords: [number, number]\n        piOus: [3, 1, 4]\n    }\n]\n')),(0,a.kt)("h2",m({},{id:"strings"}),"Strings"),(0,a.kt)("p",null,"String definitions are strings constructed from the following fragment types:"),(0,a.kt)("ul",null,(0,a.kt)("li",{parentName:"ul"},"Builtins, including keywords like ",(0,a.kt)("inlineCode",{parentName:"li"},'"number"')," and literals like ",(0,a.kt)("inlineCode",{parentName:"li"},"\"'redo'\"")),(0,a.kt)("li",{parentName:"ul"},"Aliases like ",(0,a.kt)("inlineCode",{parentName:"li"},'"user"')," or ",(0,a.kt)("inlineCode",{parentName:"li"},'"group"')," that have been defined in your space"),(0,a.kt)("li",{parentName:"ul"},"Expressions consisting of one or more string definitions modified by an operator, like ",(0,a.kt)("inlineCode",{parentName:"li"},'"user|number"')," or ",(0,a.kt)("inlineCode",{parentName:"li"},'"group[]"'))),(0,a.kt)("p",null,"The entire definition may also include at most one of each modifier, a special category for operators like '?' that are only allowed at the root of a string definition."),(0,a.kt)("h3",m({},{id:"keywords"}),"Keywords"),(0,a.kt)("p",null,"All TypeScript keywords that can be used to represent a type are valid definitions. Each of the following string definitions maps directly to its corresponding TS type:"),(0,a.kt)("table",null,(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Keyword"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Notes"))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"any"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"unknown"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Behaves like ",(0,a.kt)("inlineCode",{parentName:"td"},"any")," when used in validation.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"never"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Will always throw an error when used in validation.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"undefined"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"void"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Behaves like ",(0,a.kt)("inlineCode",{parentName:"td"},"undefined")," when used in validation")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"object"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"null"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"function"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"string"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"number"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"bigint"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"boolean"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"true"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"false"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"symbol"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}))))),(0,a.kt)("h4",m({},{id:"string-subtypes"}),"String subtypes"),(0,a.kt)("p",null,"The type of these definitions will be inferred as ",(0,a.kt)("inlineCode",{parentName:"p"},"string"),", but they will validate that the criterion corresponding to their keyword."),(0,a.kt)("table",null,(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Keyword"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"String is valid if it..."))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"email"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Matches the pattern from ",(0,a.kt)("a",m({parentName:"td"},{href:"https://emailregex.com/"}),"emailregex.com"),".")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"alpha"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Includes exclusively lowercase and/or uppercase letters.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"alphanumeric"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Includes exclusively digits, lowercase and/or uppercase letters.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"lowercase"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Does not contain uppercase letters.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"uppercase"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Does not contain lowercase letters.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"character"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Is of length 1.")))),(0,a.kt)("h4",m({},{id:"number-subtypes"}),"Number subtypes"),(0,a.kt)("p",null,"The type of these definitions will be inferred as ",(0,a.kt)("inlineCode",{parentName:"p"},"number"),", but they will validate that the criterion corresponding to their keyword."),(0,a.kt)("table",null,(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Keyword"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Number is valid if it..."))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"integer"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Is an integer.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"positive"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Is greater than 0.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"nonnegative"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Is greater than or equal to 0.")))),(0,a.kt)("h3",m({},{id:"literals"}),"Literals"),(0,a.kt)("p",null,"Literals are used to specify a ",(0,a.kt)("inlineCode",{parentName:"p"},"string"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"number"),", or ",(0,a.kt)("inlineCode",{parentName:"p"},"bigint")," type constrained to an exact value."),(0,a.kt)("table",null,(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Literal"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Syntax"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Examples"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Notes"))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"string"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"\"'T'\"")," or ",(0,a.kt)("inlineCode",{parentName:"td"},"'\"T\"'")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"\"'redo'\"")," or ",(0,a.kt)("inlineCode",{parentName:"td"},"'\"WithDoubleQuotes\"'")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"As of now, literals containing the quote character that encloses them are not supported. Support for an escape character is tracked ",(0,a.kt)("a",m({parentName:"td"},{href:"https://github.com/re-do/re-po/issues/346"}),"here"),".")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"regex"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"/T/")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"/[a-z]*@redo\\.dev/"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Validation checks whether a string matching the expression. Type is always inferred as ",(0,a.kt)("inlineCode",{parentName:"td"},"string"),". Lack of an escape character for regex containing ",(0,a.kt)("inlineCode",{parentName:"td"},'"/"')," is tracked ",(0,a.kt)("a",m({parentName:"td"},{href:"https://github.com/re-do/re-po/issues/346"}),"here"),".")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"number"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"T"'),", where T is a numeric value"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"5"')," or ",(0,a.kt)("inlineCode",{parentName:"td"},'"-7.3"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Though validation checks for the literal's exact value, TypeScript widens its type to ",(0,a.kt)("inlineCode",{parentName:"td"},"number"),". To avoid this behavior, use a number primitive.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"bigint"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"Tn"'),", where T is an integer"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},'"0n"')," or ",(0,a.kt)("inlineCode",{parentName:"td"},'"-999n"')),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Though validation checks for the literal's exact value, TypeScript widens its type to ",(0,a.kt)("inlineCode",{parentName:"td"},"bigint"),". To avoid this behavior, use a bigint primitive.")))),(0,a.kt)("p",null,"While ",(0,a.kt)("inlineCode",{parentName:"p"},"boolean")," values could also be considered literals, they are modeled as keywords since, unlike other literal types, they can can be defined as a finite set (i.e. ",(0,a.kt)("inlineCode",{parentName:"p"},"true")," and ",(0,a.kt)("inlineCode",{parentName:"p"},"false"),")."),(0,a.kt)("h3",m({},{id:"expressions"}),"Expressions"),(0,a.kt)("p",null,"Expressions are a set of syntactic patterns that can be applied to one or more nested string definitions to modify the type they represent. Unless otherwise noted, expressions can be applied to any valid string definition, including other expressions."),(0,a.kt)("p",null,"The following table is ordered by relative precedence in the event that a definition matches multiple patterns. For example, the definition ",(0,a.kt)("inlineCode",{parentName:"p"},'"string|boolean[]"')," would be interpreted as either a ",(0,a.kt)("inlineCode",{parentName:"p"},"string")," or a list of ",(0,a.kt)("inlineCode",{parentName:"p"},"boolean"),' since "Or" applies before "List." Arbitrary parenthetical grouping is not yet supported, but can be emulated by adding the desired grouping to a space and referencing its alias.'),(0,a.kt)("table",null,(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Expression"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Pattern"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Examples"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Notes"))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Arrow Function"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"(T1,T2,...)=>T3")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"(string,boolean[])=>void")," ",(0,a.kt)("br",null),(0,a.kt)("inlineCode",{parentName:"td"},"()=>object")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"At runtime, falls back to validating that a value is of type ",(0,a.kt)("inlineCode",{parentName:"td"},"function"),".")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Union"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"T1\\|T2")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"false\\|string")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Acts just like TypeScript's union operator (",(0,a.kt)("inlineCode",{parentName:"td"},"\\|"),'). Think of it like a logical "or."')),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Intersection"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"T1&T2")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"positive&integer")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Acts just like TypeScript's intersection operator (",(0,a.kt)("inlineCode",{parentName:"td"},"&"),'). Think of it like a logical "and."')),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Constraint"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"T<N")," OR ",(0,a.kt)("inlineCode",{parentName:"td"},"N1<T<N2")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"number<=100")," ",(0,a.kt)("br",null)," ",(0,a.kt)("inlineCode",{parentName:"td"},"5<alphanumeric<20")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Constraints are number or string keyword singly or doubly bounded by number literals. All comparison operators (<, >, <=, >=) are available. Constraints do not affect the inferred type of the number or string keyword, but will bound the value of a number or the length of a string during validation. Note that for a single-bounded constraint, the keyword must precede its bound.")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"List"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"T[]")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"string[]")," ",(0,a.kt)("br",null),(0,a.kt)("inlineCode",{parentName:"td"},"number[][]")),(0,a.kt)("td",m({parentName:"tr"},{align:null}))))),(0,a.kt)("h3",m({},{id:"modifiers"}),"Modifiers"),(0,a.kt)("p",null,"Unlike expressions, modifiers are not composable and may only be applied to the root of a string definition. For instance, ",(0,a.kt)("inlineCode",{parentName:"p"},'"string|number?"')," is a valid definition representing an optional string or number, whereas ",(0,a.kt)("inlineCode",{parentName:"p"},'"string?|number"')," is invalid because the ",(0,a.kt)("inlineCode",{parentName:"p"},'"?"')," modifier is only valid if applied after all other non-modifier expressions."),(0,a.kt)("table",null,(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Exrpession"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Pattern"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Examples"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Notes"))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Optional"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"T?")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"function?")," ",(0,a.kt)("br",null),(0,a.kt)("inlineCode",{parentName:"td"},"boolean[]?")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Adds ",(0,a.kt)("inlineCode",{parentName:"td"},"undefined")," as a possible value. When used in an Object type, also makes the corresponding key optional.")))),(0,a.kt)("h2",m({},{id:"primitives"}),"Primitives"),(0,a.kt)("p",null,"Any definition that is neither a string nor an object is considered a primitive and models a type that allows only its exact value. All primitive definitions correspond to an equivalent string definition, so whether you use them often comes down to stylistic preference, though there are some noted circumstances in which they allow TypeScript to infer narrower types than their string equivalents."),(0,a.kt)("table",null,(0,a.kt)("thead",{parentName:"table"},(0,a.kt)("tr",{parentName:"thead"},(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Definition Type"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Examples"),(0,a.kt)("th",m({parentName:"tr"},{align:null}),"Notes"))),(0,a.kt)("tbody",{parentName:"table"},(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"undefined"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"undefined")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Requires compiler option ",(0,a.kt)("inlineCode",{parentName:"td"},'"strictNullChecks"')," or ",(0,a.kt)("inlineCode",{parentName:"td"},'"strict"')," set to ",(0,a.kt)("inlineCode",{parentName:"td"},"true")," in your ",(0,a.kt)("inlineCode",{parentName:"td"},"tsconfig.json"),".")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"null"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"null")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"Requires compiler option ",(0,a.kt)("inlineCode",{parentName:"td"},'"strictNullChecks"')," or ",(0,a.kt)("inlineCode",{parentName:"td"},'"strict"')," set to ",(0,a.kt)("inlineCode",{parentName:"td"},"true")," in your ",(0,a.kt)("inlineCode",{parentName:"td"},"tsconfig.json"),".")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"boolean"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"true")," ",(0,a.kt)("br",null)," ",(0,a.kt)("inlineCode",{parentName:"td"},"false")),(0,a.kt)("td",m({parentName:"tr"},{align:null}))),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"number"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"0")," ",(0,a.kt)("br",null)," ",(0,a.kt)("inlineCode",{parentName:"td"},"32.33")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"TS infers the exact value of ",(0,a.kt)("inlineCode",{parentName:"td"},"number")," primitives, while string literals are always widened to ",(0,a.kt)("inlineCode",{parentName:"td"},"number"),".")),(0,a.kt)("tr",{parentName:"tbody"},(0,a.kt)("td",m({parentName:"tr"},{align:null}),"bigint"),(0,a.kt)("td",m({parentName:"tr"},{align:null}),(0,a.kt)("inlineCode",{parentName:"td"},"99n")," ",(0,a.kt)("br",null)," ",(0,a.kt)("inlineCode",{parentName:"td"},"-100n")),(0,a.kt)("td",m({parentName:"tr"},{align:null}),"TS infers the exact value of ",(0,a.kt)("inlineCode",{parentName:"td"},"bigint")," primitives, while string literals are always widened to ",(0,a.kt)("inlineCode",{parentName:"td"},"bigint"),". ",(0,a.kt)("br",null)," Requires a target of ES2020 or higher.")))))}y.isMDXComponent=!0}}]);