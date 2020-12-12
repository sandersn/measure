questions:

1. Types yes/no? (Different between JS/TS?)
2. Documentation yes/no? (Different between JS/TS?)
3. Both yes/no?
3. Relative usage rate compared to @param (@param-w/o-return / total-@param) (different between JS/TS?)
4. Bonus: return vs returns?!?!?!

Implementation ideas:

1. Don't put any @return
2. Put @return but no type
3. Put @return and a type (but not in TS)

```
/**
 * @param {number} x
 * @returns {any}
 */
function foo(x) { return x + 1 }
```

Notes:

47,000 "projectified deduped" lines

26,0007 JS
22,143 TS

JS followed by type: 23122 (89%)
TS followed by type: 4937 (22%)

JS followed by type then docs: 14333 (62%)
TS followed by type then docs: 2954 (60%)

@return vs @returns is about 50/50


166,000 deduped @param

60,980 JS
106,278 TS


@param w/o return vs @param w/return (TS):

8858 / 5264 = 60% (TS)
30777 / 6309 = 20% (JS)

Total | w/Return

572 510
319 115
430 308
174 136
348 264
370 164
185 144
383 258
275 202
244 208
255 194
23  18
0   0
0   0
0   0
231 168
245 174
99  44
239 47
115 88
175 66
314 91
324 90
80  62

155 52
241 92
153 103
216 28
13  9
222 158
401 221
314 132
161 52
267 181
306 180
64  54
0   0
9   9
254 204
329 218
212 114
141 106


Total | w/Return

481 353
639 53
316 103
154 103
63  23
718 97
317 110
463 16


1556 200
1000 207
1699 43
181 48
64  42
34  27
172 56
13  5
41  23
253 26
71  5
190 12
512 46
30  17
737 95
76  2
139 63
248 6
101 1
274 92
62  48
363 51
96  12
586 53
57  47
157 86
180 62
4   2
15  6
263 147
716 92
36  19
0   0
0   0
7   2
418 31
321 60
194 107
391 67
424 88
518 383
883 191
53 14
135 90
23 13
343 22
296 82
968 68
674 53
61  23
5   0
78  26
181 105
205 55
539 31
117 68
388 69
646 45
163 57
40  12
638 149
524 103
714 141
87  28
0   0
252 8
142 6
619 45
377 142
294 39
202 8
590 17
54  33
335 146
174 94
520 156
44  18
64  44
340 43
683 61
32  12
1   0
102 34
159 91
5   2
29  15
87  47
114 40
0   0
34  26
144 76
5   3
515 27
453 18
52  23
126 51
212 117
0   0
25  13
149 81
63  40
335 38
334 33
