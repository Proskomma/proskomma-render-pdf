import { ScriptureDocSet } from 'proskomma-render';
import MainDocument from './CanonicalDocument.js';
import PeripheralDocument from './PeripheralDocument.js';
import {startHTMLTemplate, endHTMLTemplate, tocHTMLTemplate, titleHTMLTemplate} from './htmlResources.js';

export default class MainDocSet extends ScriptureDocSet {

    constructor(result, context, config) {
        super(result, context, config);
        this.frontOutput = [];
        this.backOutput = [];
        this.bookTitles = {};
        this.output = '';
        addActions(this);
    }

    modelForDocument(document) {
        if (document.idParts.type === 'periph') {
            return 'peripheral';
        } else {
            return 'default';
        }
    }
}

const addActions = (dsInstance) => {
    const dInstance = new MainDocument(dsInstance.result, dsInstance.context, dsInstance.config);
    dsInstance.addDocumentModel('default', dInstance);
    const pDInstance = new PeripheralDocument(dsInstance.result, dsInstance.context, dsInstance.config);
    dsInstance.addDocumentModel('peripheral', pDInstance);
    dsInstance.addAction(
        'startDocSet',
        () => true,
        (renderer) => {
            const flattenedStructure = a => {
                let ret = [];
                for (const e of a) {
                    if (e[0] === 'section') {
                        ret = [...ret, ...flattenedStructure(e[2])];
                    } else {
                        ret.push(e);
                    }
                }
                return ret;
            }
            renderer.bookTitles = {};
            renderer.usedDocuments = flattenedStructure(renderer.config.structure)
                .map(e => e[0] === 'bookCode' ? e[1] : renderer.context.docSet.peripherals[e[1]]);
        },
    );
    dsInstance.addAction(
        'endDocSet',
        () => true,
        (renderer) => {
            const nestedToc = (records, level) => {
                level = level || 1;
                let ret = [];
                for (const record of records) {
                    if (record[0] === 'section') {
                        ret.push(`<li>\n<div class="toc_level${level}">${renderer.config.i18n[record[1]] || '???'}</div>\n<ol>\n${nestedToc(record[2], level + 1)}</ol>\n</li>`);
                    } else if (record[0] === 'periph') {
                        const pName = renderer.context.docSet.peripherals[record[1]];
                        ret.push(`<li class="toc_periph leader"><a href="#title_${renderer.context.docSet.peripherals[record[1]]}">${renderer.bookTitles[pName][2]}</a></li>`);
                    } else if (record[1] === 'GLO') {
                        ret.push(`<li class="leader"><a href="#title_${record[1]}">${renderer.config.i18n.glossary}</a></li>\n`);
                    } else {
                        ret.push(`<li class="leader"><a href="#title_${record[1]}">${renderer.bookTitles[record[1]][2]}</a></li>`);
                    }
                }
                return ret.join('\n');
            }
            let startHTML = startHTMLTemplate;
            startHTML = startHTML.replace(/%titlePage%/g, renderer.config.i18n.titlePage);
            const textDirection = renderer.config.textDirection || 'ltr';
            startHTML = startHTML.replace(/%textDirection%/g, textDirection);
            startHTML = startHTML.replace(/%left%/g, textDirection === 'ltr' ? 'left' : 'right');
            startHTML = startHTML.replace(/%right%/g, textDirection === 'ltr' ? 'right' : 'left');
            renderer.frontOutput.push(startHTML);
            let title = titleHTMLTemplate;
            title = title.replace(/%titlePage%/g, renderer.config.i18n.titlePage);
            title = title.replace(/%copyright%/g, renderer.config.i18n.copyright);
            renderer.frontOutput.push(title);
            let toc = tocHTMLTemplate;
            toc = toc.replace(/%contentLinks%/g, nestedToc(renderer.config.structure));
            toc = toc.replace(/%toc_books%/g, renderer.config.i18n.tocBooks);
            renderer.frontOutput.push(toc);
            let bodyOutput = renderer.usedDocuments.map(b => renderer.config.bookOutput[b]).join('');
            let endHTML = endHTMLTemplate;
            renderer.backOutput.push(endHTML);
            const output = renderer.frontOutput.join('\n') + '\n' + bodyOutput + renderer.backOutput.join('\n');
            renderer.config.output = output;
        }
    );
}
