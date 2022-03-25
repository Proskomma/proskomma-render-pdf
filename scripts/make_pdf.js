import fse from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';
import appRootPath from "app-root-path";
const appRoot = appRootPath.toString();
import {Proskomma} from 'proskomma';
import {doRender} from '../index.js';
import { exit } from 'process';

const bookMatches = str => {
    for (const book of config.bookSources) {
        if (str.includes(book) || str.includes(book.toLowerCase())) {
            return true;
        }
    }
    return false;
}

const peripheralMatches = str => {
    for (const periph of config.peripheralSources) {
        if (str.includes(periph) || str.includes(periph.toLowerCase())) {
            return true;
        }
    }
    return false;
}

if (process.argv.length !== 4) {
    throw new Error("USAGE: node make_pdf.js <configPath> <pdfOutputPath>");
}

const configPath = path.resolve(appRoot, process.argv[2]);
const config = fse.readJsonSync(configPath);
config.codeRoot = appRoot;
config.configRoot = path.dirname(configPath);


const pdfOutputPath = path.resolve(process.argv[3]);
if (!pdfOutputPath) {
    throw new Error("USAGE: node make_pdf.js <configPath> <pdfOutputPath>");
}
const baseOutputPath = pdfOutputPath.replace(/\.pdf$/, "");
const prePagedJSHtmlOutputPath = baseOutputPath+"_pre_pagedjs.html";
const postPagedJSHtmlOutputPath = baseOutputPath+"_post_pagedjs.html";

console.log(pdfOutputPath, baseOutputPath, prePagedJSHtmlOutputPath, postPagedJSHtmlOutputPath)

let prePagedJSHtml = "";

if (! fse.existsSync(prePagedJSHtmlOutputPath)) {
config.bookOutput = {};

let ts = Date.now();
let nBooks = 0;
let nPeriphs = 0;

const pk = new Proskomma();
const fqSourceDir = path.resolve(config.configRoot, config.sourceDir);
for (const filePath of fse.readdirSync(fqSourceDir)) {
    if (bookMatches(filePath)) {
        console.log(`   ${filePath} (book)`);
        nBooks++;
        const content = fse.readFileSync(path.join(fqSourceDir, filePath));
        const contentType = filePath.split('.').pop();
        pk.importDocument(
            {lang: "xxx", abbr: "yyy"},
            contentType,
            content,
            {}
        );
    } else if (peripheralMatches(filePath)) {
        console.log(`   ${filePath} (peripheral)`);
        nPeriphs++;
        let content = fse.readFileSync(path.join(fqSourceDir, filePath));
        pk.importUsfmPeriph(
            { lang: 'xxx', abbr: 'yyy' },
            content,
            {},
        );
    }
}
console.log(`${nBooks} book(s) and ${nPeriphs} peripheral(s) loaded in ${(Date.now() - ts) / 1000} sec`);
ts = Date.now();

const config2 = await doRender(pk, config);
prePagedJSHtml = config2.output;

fse.writeFileSync(prePagedJSHtmlOutputPath, prePagedJSHtml);
console.log("Pre-PagedJS HTML written to: "+prePagedJSHtmlOutputPath);
}
else {
    prePagedJSHtml = fse.readFileSync(prePagedJSHtmlOutputPath, 'utf8');
}

const browser = await puppeteer.launch();
const page = await browser.newPage();
page.setDefaultTimeout(3000000);
await page.setContent(prePagedJSHtml);
page.on('console', msg => {
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`${i}: ${msg.args()[i]}`);
  });

try {
    console.log("Waiting for Paged.JS to render the TOC...");
    await page.waitForFunction(() => {console.log("Current Page: "+pjCurrentPageNum);return pjRenderingDone;},
        {timeout: 3000000, polling: "mutation"} // Set timeout here. This is 5 minutes. TODO: Add to config file?
    );
} catch(e) {
    if (e instanceof puppeteer.errors.TimeoutError) {
        console.error("Paged.JS TOC render timed out!")
    } else {
        console.error("ERROR: ", e);
    }
    exit(1);
}

let staticHtml = await page.content();

fse.writeFileSync(postPagedJSHtmlOutputPath, staticHtml);
console.log("Static HTML written to: "+postPagedJSHtmlOutputPath);

await page.pdf({path: pdfOutputPath, format: 'A4', timeout: 300000})
console.log("PDF written to: "+pdfOutputPath)

await browser.close();
