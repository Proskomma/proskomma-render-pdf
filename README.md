# proskomma-render-pdf
### Scripture PDF generator based on proskomma-render

This project uses [proskomma-render](https://github.com/Proskomma/proskomma-render) to produce HTML suitable for processing by [PagedJS](https://www.pagedjs.org/), an implementation of [CSS Paged Media](https://www.w3.org/TR/css-page-3/).

## Example Sources

[unfoldingWord Literal Text](https://www.unfoldingword.org/ult) (Psalms and Gospels)

## To set up

You will need Node and NPM.
```
cd proskomma-render-pdf
npm install
npm test # Currently not in Windows
```
## To make PagedJS-aware HTML from which to 'save' a PDF file

```
node ./make_pdf.js config/config_ult.json ~/Desktop/ult_demo.html
# Open this HTML file with a browser
# Wait for it to paginate the content
# Save as PDF
```
