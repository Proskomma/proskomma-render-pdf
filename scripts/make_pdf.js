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
config.bookOutput = {};
config.pjsCallbacks = true; // NEEDED FOR PUPPETEER MONITORING

let ts = Date.now();
let nBooks = 0;
let nPeriphs = 0;

const pk = new Proskomma();
const fqSourceDir = path.resolve(config.configRoot, config.sourceDir);
console.log(`Loading data from '${fqSourceDir}'`);
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
console.log(`   ${nBooks} book(s) and ${nPeriphs} peripheral(s) loaded in ${(Date.now() - ts) / 1000} sec`);

const config2 = await doRender(pk, config);
const prePagedJSHtml = config2.output;

const prePagedJSHtmlOutputPath = pdfOutputPath.replace(/\.pdf$/, "")+"_pre_pagedjs.html";
fse.writeFileSync(prePagedJSHtmlOutputPath, prePagedJSHtml);
console.log(`Pre-PagedJS HTML written to '${prePagedJSHtmlOutputPath}' (file://${encodeURI(prePagedJSHtmlOutputPath)})`);
console.log("View in browser to see HTML rendered with PagedJS");
console.log("Rendering HTML using Puppeteer");
ts = Date.now();
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setContent(prePagedJSHtml);
page.on('console', msg => {
    for (const arg of msg.args()) {
        console.log(`   ${arg.toString().split(':')[1] || arg.toString()}`);
    }
  });

try {
    let currentPage = {n: 0};
    await page.waitForFunction(
    (currentPage) => {
        if (pjCurrentPageNum !== currentPage.n) {
            console.log(`Page ${pjCurrentPageNum}`);
            currentPage.n = pjCurrentPageNum;
        }
        return pjRenderingDone;
    }
,
        {timeout: 120000, polling: "mutation"},
        currentPage
    );
} catch(e) {
    if (e instanceof puppeteer.errors.TimeoutError) {
        console.error("Paged.JS TOC render timed out!")
    } else {
        console.error("ERROR: ", e);
    }
    exit(1);
}
console.log(`HTML rendered in ${(Date.now() - ts) /  1000} seconds`)

let staticHtml = await page.content();

const staticHtmlOutputPath = pdfOutputPath.replace(/\.pdf$/, "")+"_static.html";
fse.writeFileSync(staticHtmlOutputPath, staticHtml);
console.log(`Static HTML written to '${staticHtmlOutputPath}' (file://${encodeURI(staticHtmlOutputPath)})`);
console.log("Converting HTML to PDF");
ts = Date.now();
await page.pdf({path: pdfOutputPath, format: 'A4'})
console.log(`PDF produced in ${(Date.now() - ts) /  1000} seconds and written to '${pdfOutputPath}'`);

await browser.close();
