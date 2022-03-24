# proskomma-render-pdf
### Scripture PDF generator based on proskomma-render

This project uses [proskomma-render](https://github.com/Proskomma/proskomma-render) to produce HTML suitable for processing by [PagedJS](https://www.pagedjs.org/), an implementation of [CSS Paged Media](https://www.w3.org/TR/css-page-3/).

## Installation
You will need Node and NPM.
```
cd proskomma-render-pdf
npm install
```

## Usage
`import {doRender} from 'proskomma-render-pdf';`

`doRender` takes as arguments
- an instance of Proskomma which has been preloaded with (at least) the necessary documents
- a config object
- optionally, an array of docSetIds to render
- optionally, an array of documentIds to render

See the scripts for detailed usage.

## Example Usage
### Scripts

The `make_pdf.js` Node script produces PDF directly (in places where puppeteer may be used).

```
cd scripts
node ./make_pdf.js config/config_ult.json ~/Desktop/ult_demo.pdf
```

The `make_html_pdf.js` script produces 'chunked' HTML, which may then be converted to PDF in a web page via the browser's 'save as PDF' feature.

```
cd scripts
node ./make_html_for_pdf.js config/config_ult.json ~/Desktop/ult_demo.html
# Open this HTML file with a browser
# Wait for it to paginate the content
# Save as PDF
```

### Example Sources

from [unfoldingWord Literal Text](https://www.unfoldingword.org/ult) (Psalms and Gospels)
