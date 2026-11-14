Instructions per call (median of 3 reps; gate max/min <= 1.001), Node 24.14.1, cores 10-15.

### parseSafe

|   # | arm                       | instructions |             max/min |
| --: | ------------------------- | -----------: | ------------------: |
|   1 | arktype-b1                |        184.4 | 1.0029 (fails gate) |
|   2 | arktype-b2                |        207.0 | 1.0014 (fails gate) |
|   3 | @ts-runtypes              |        208.9 | 1.0013 (fails gate) |
|   4 | typia                     |        212.9 | 1.0013 (fails gate) |
|   5 | arktype-dynamic           |        216.4 | 1.0013 (fails gate) |
|   6 | ata-(ahead-of-time)       |        219.7 |              1.0000 |
|   7 | ata                       |        223.7 | 1.0012 (fails gate) |
|   8 | @sx3/gate                 |        233.4 | 1.0011 (fails gate) |
|   9 | rescript-schema           |        233.6 | 1.0011 (fails gate) |
|  10 | zod (compiled)            |        250.4 |              1.0000 |
|  11 | paseri-(ahead-of-time)    |        257.7 | 1.0010 (fails gate) |
|  12 | sury                      |        269.6 |              1.0000 |
|  13 | spectypes                 |        370.0 |              1.0007 |
|  14 | pure-parse (JIT compiled) |        550.7 |              1.0005 |

### assertLoose

|   # | arm                               | instructions |             max/min |
| --: | --------------------------------- | -----------: | ------------------: |
|   1 | arktype-b1                        |         66.0 |              1.0001 |
|   2 | ts-runtime-checks                 |         74.0 |              1.0001 |
|   3 | ts-auto-guard                     |         78.0 |              1.0000 |
|   4 | type-predicate-generator          |         79.0 |              1.0000 |
|   5 | @sinclair/typebox-(ahead-of-time) |         82.0 |              1.0001 |
|   6 | typia                             |         82.0 |              1.0001 |
|   7 | @ts-runtypes                      |         83.0 |              1.0000 |
|   8 | arktype-dynamic                   |         85.0 |              1.0001 |
|   9 | spectypes                         |         94.0 |              1.0000 |
|  10 | ata                               |         94.0 |              1.0001 |
|  11 | ata-(ahead-of-time)               |         94.0 |              1.0001 |
|  12 | paseri-(ahead-of-time)            |         97.0 |              1.0000 |
|  13 | stnl (just-in-time)               |        100.0 |              1.0000 |
|  14 | @sinclair/typebox-(just-in-time)  |        109.0 |              1.0001 |
|  15 | rescript-schema                   |        130.0 |              1.0000 |
|  16 | @sx3/gate                         |        132.0 |              1.0000 |
|  17 | @sinclair/typemap/valibot         |        141.0 |              1.0001 |
|  18 | sury                              |        166.0 |              1.0000 |
|  19 | pure-parse (JIT compiled)         |        199.0 |              1.0000 |
|  20 | ajv                               |        293.0 |              1.0009 |
|  21 | zod (compiled)                    |        473.0 |              1.0000 |
|  22 | arktype-b2                        |       3220.4 | 1.0075 (fails gate) |

### assertStrict

|   # | arm                               | instructions |             max/min |
| --: | --------------------------------- | -----------: | ------------------: |
|   1 | ata-(ahead-of-time)               |        292.0 |              1.0000 |
|   2 | @ts-runtypes                      |        296.0 |              1.0000 |
|   3 | ata                               |        301.0 |              1.0000 |
|   4 | typia                             |        324.3 |              1.0000 |
|   5 | @sinclair/typebox-(ahead-of-time) |        331.3 |              1.0008 |
|   6 | arktype-b1                        |        332.0 |              1.0000 |
|   7 | paseri-(ahead-of-time)            |        343.0 | 1.0059 (fails gate) |
|   8 | arktype-dynamic                   |        348.0 |              1.0000 |
|   9 | @sinclair/typebox-(just-in-time)  |        361.6 |              1.0008 |
|  10 | @sinclair/typemap/valibot         |        390.3 |              1.0007 |
|  11 | @sx3/gate                         |        408.0 |              1.0000 |
|  12 | arktype-b2                        |        421.0 |              1.0000 |
|  13 | ts-runtime-checks                 |        425.0 |              1.0000 |
|  14 | spectypes                         |        481.0 |              1.0005 |
|  15 | rescript-schema                   |        510.0 |              1.0000 |
|  16 | sury                              |        536.0 |              1.0000 |
|  17 | ajv                               |        645.0 |              1.0004 |
|  18 | zod (compiled)                    |        746.0 |              1.0000 |
|  19 | arktype-2.2.9                     |       5325.8 | 1.2577 (fails gate) |

### parseStrict

|   # | arm                              | instructions |             max/min |
| --: | -------------------------------- | -----------: | ------------------: |
|   1 | ata-(ahead-of-time)              |        297.0 |              1.0000 |
|   2 | ata                              |        302.0 |              1.0000 |
|   3 | @ts-runtypes                     |        302.0 |              1.0000 |
|   4 | typia                            |        334.6 |              1.0000 |
|   5 | arktype-b1                       |        339.0 |              1.0000 |
|   6 | paseri-(ahead-of-time)           |        354.0 |              1.0000 |
|   7 | arktype-dynamic                  |        365.0 |              1.0000 |
|   8 | @sinclair/typebox-(just-in-time) |        372.3 |              1.0007 |
|   9 | @sx3/gate                        |        415.0 |              1.0000 |
|  10 | ts-runtime-checks                |        428.0 |              1.0000 |
|  11 | arktype-b2                       |        449.7 |              1.0006 |
|  12 | spectypes                        |        488.7 |              1.0006 |
|  13 | rescript-schema                  |        521.0 |              1.0000 |
|  14 | sury                             |        538.0 |              1.0000 |
|  15 | zod (compiled)                   |        610.6 |              1.0009 |
|  16 | pure-parse (JIT compiled)        |       1674.3 | 1.0159 (fails gate) |
|  17 | arktype-2.2.9                    |       4276.8 | 1.1951 (fails gate) |

### schema-benchmarks

|   # | arm              | instructions | max/min |
| --: | ---------------- | -----------: | ------: |
|   1 | sb valid b1      |       6003.2 |  1.0004 |
|   2 | sb valid dynamic |       6005.2 |  1.0005 |
