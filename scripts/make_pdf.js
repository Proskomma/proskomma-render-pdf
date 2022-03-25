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

let prePagedJSHtml = "";

config.bookOutput = {};
config.pjsCallbacks = true; // NEEDED FOR PUPPETEER MONITORING

let ts = Date.now();
let nBooks = 0;
let nPeriphs = 0;

const pk = new Proskomma();
const fqSourceDir = path.resolve(config.configRoot, config.sourceDir);
console.log(`Loading data from '${fqSourceDir}' into Proskomma...`);
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
console.log(`${nBooks} book(s) and ${nPeriphs} peripheral(s) loaded in ${(Date.now() - ts) / 1000} seconds\n`);

console.log("Rendering HTML in Proskomma...")
ts = Date.now()
const config2 = await doRender(pk, config);
prePagedJSHtml = config2.output;
fse.writeFileSync(prePagedJSHtmlOutputPath, prePagedJSHtml);
console.log(`Pre-PagedJS HTML rendered in ${(Date.now() - ts) /  1000} seconds and written to {prePagedJSHtmlOutputPath}\n`)

console.log("Rendering HTML with PagedJS in Puppeteer...")
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
        },
        {timeout: 300000, polling: "mutation"}, // 5 minutes
        currentPage
    );
} catch(e) {
    if (e instanceof puppeteer.errors.TimeoutError) {
        console.error("   Paged.JS TOC render timed out!")
    } else {
        console.error("   ERROR: ", e);
    }
    exit(1);
}
let postPagedJSHtml = await page.content();
fse.writeFileSync(postPagedJSHtmlOutputPath, postPagedJSHtml);
console.log(`PagedJS HTML rendered in ${(Date.now() - ts) /  1000} seconds and written to ${postPagedJSHtmlOutputPath}\n`)

console.log("Converting PagedJS HTML to PDF...");
ts = Date.now();
await page.pdf({path: pdfOutputPath, format: 'A4', timeout: 300000}); // 5 minutes
await browser.close();
console.log(`PDF produced in ${(Date.now() - ts) /  1000} seconds and written to '${pdfOutputPath}'\n`);
