---
active: true
iteration: 3
max_iterations: 5
completion_promise: "IMPLEMENTED"
started_at: "2026-01-21T21:11:06Z"
---



# Features
## A new page to edit the style for invoice PDF
- this page would have 2 sections.
1st: would be sized 8/12 cols and inside it is the preview of the paper page that would be converted into PDF. I want the details for the invoice here to be movable, customizable, draggable, add border style, add tables, and can setup details like via handlebars like '{{client_name}}' or '{{name}}' or '{{client_address}}', etc... and I want these things to be movable, and we should add rulers to allow the users to align better. I also would want the users to be able to customize the font-family, font-sizes, font-weights, etc... but make sure that the size should always be A4
2nd: would sized 4/12 cols and this would be the area where the details can be dragged from. Example the name, address, phone number, client name, client address, etc... 


Make sure to perform all the tests especially e2e tests with playwright and unit test with vitest. It should be fully functional, performant and most of all the security must be top notch <promise>IMPLEMENTED<promise> when all passed all the tests, security, and performance
