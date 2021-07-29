const { ScriptureParaDocument } = require('proskomma-render');
const sharedActions = require('./shared_actions');

class PeripheralDocument extends ScriptureParaDocument {

    constructor(result, context, config) {
        super(result, context, config);
        this.head = [];
        this.bodyHead = [];
        this.body = [];
        addActions(this);
    }

}

const addActions = (dInstance) => {
    // Initialize headers (not including title) and other state
    dInstance.addAction(
        'startDocument',
        () => true,
        (renderer, context) => {
            let cssPath = "../../CSS/styles.css";
            dInstance.head = [
                '<meta charset=\"utf-8\"/>\n',
                `<link type="text/css" rel="stylesheet" href="${cssPath}" />\n`,
                `<title>${context.document.headers.h}</title>`,
            ];
            dInstance.body = [];
            dInstance.bodyHead = [];
            const periphTitle = context.document.idParts[3];
            dInstance.docSetModel.bookTitles[context.document.headers.bookCode] = [
                periphTitle,
                periphTitle,
                periphTitle,
                periphTitle,
            ];
            dInstance.context.document.chapters = [];
        }
    );
    // Follow some block grafts to secondary content
    dInstance.addAction(
        'blockGraft',
        context => ["title", "heading", "introduction"].includes(context.sequenceStack[0].blockGraft.subType),
        (renderer, context, data) => {
            renderer.renderSequenceId(data.payload);
        }
    );
    // Start new stack row for new block
    dInstance.addAction(...sharedActions.startBlock);
    // Render title block
    dInstance.addAction(
        'endBlock',
        context => context.sequenceStack[0].type === "title",
        (renderer, context, data) => {
            const htmlClass = data.bs.payload.split('/')[1];
            const tag = ["mt", "ms"].includes(htmlClass) ? "h1" : "h2";
            renderer.bodyHead.push(`<${tag} class="${htmlClass}">${renderer.topStackRow().join("").trim()}</${tag}>\n`);
            renderer.popStackRow();
        },
    );
    // Render heading block
    dInstance.addAction(
        'endBlock',
        context => context.sequenceStack[0].type === "heading",
        (renderer, context, data) => {
            const htmlClass = data.bs.payload.split("/")[1];
            let headingTag;
            switch (htmlClass) {
                case "s":
                case "is":
                    headingTag = "h3";
                    break;
                default:
                    headingTag = "h4";
            }
            renderer.body.push(`<${headingTag} class="${htmlClass}">${renderer.topStackRow().join("").trim()}</${headingTag}>\n`);
            renderer.popStackRow();
        },
    );
    // process footnote content
    dInstance.addAction(
        'endBlock',
        context => context.sequenceStack[0].type === "footnote",
        renderer => {
            const footnoteContent = renderer.topStackRow().join("").trim("");
            renderer.popStackRow();
            renderer.context.sequenceStack[1].renderStack[0].push(`<span class="footnote">${footnoteContent}</span>`);
        },
    );
    // Render main or introduction block in a div with class derived from the block scope
    dInstance.addAction(
        'endBlock',
        context => ["main", "introduction"].includes(context.sequenceStack[0].type),
        (renderer, context, data) => {
            const htmlClass = data.bs.payload.split("/")[1];
            renderer.body.push(`<div class="${htmlClass}">${renderer.topStackRow().join("").trim()}</div>\n`);
            renderer.popStackRow();
        },
    );
    // Character markup - open or close an element
    dInstance.addAction(...sharedActions.characterScope);
    // Unhandled scope
    dInstance.addAction(...sharedActions.w);
    dInstance.addAction(...sharedActions.unhandledScope);
    // Tokens, including attempt to add French spaces and half-spaces after punctuation
    dInstance.addAction(
        'token',
        () => true,
        (renderer, context, data) => {
            let tokenString;
            if (["lineSpace", "eol"].includes(data.subType)) {
                tokenString = " ";
            } else {
                if ([";", "!", "?"].includes(data.payload)) {
                    if (renderer.topStackRow().length > 0) {
                        let lastPushed = renderer.topStackRow().pop();
                        lastPushed = lastPushed.replace(/ $/, "&#8239;");
                        renderer.appendToTopStackRow(lastPushed);
                    }
                    tokenString = data.payload;
                } else if ([":", "»"].includes(data.payload)) {
                    if (renderer.topStackRow().length > 0) {
                        let lastPushed = renderer.topStackRow().pop();
                        lastPushed = lastPushed.replace(/ $/, "&#160;");
                        renderer.appendToTopStackRow(lastPushed);
                    }
                    tokenString = data.payload;
                } else {
                    tokenString = data.payload.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }
            }
            return renderer.appendToTopStackRow(tokenString);
        }
    );
        // process footnote
        dInstance.addAction(
            'inlineGraft',
            (context, data) => data.subType === "footnote",
            (renderer, context, data) => {
                renderer.renderSequenceId(data.payload);
            }
        );
    // Generate document HTML
    dInstance.addAction(
        'endSequence',
        context => context.sequenceStack[0].type === "main",
        (renderer, context) => {
           let bodyHead = renderer.bodyHead.join("");
            renderer.config.bookOutput[context.document.headers.bookCode] =
                [
                    '<div class="periph">\n',
                    `<a id="title_${context.document.headers.bookCode}"/>\n`,
                    `<p class="runningHeader">${dInstance.docSetModel.bookTitles[context.document.headers.bookCode][0]}</p>\n`,
                    `<header>\n${bodyHead}\n</header>\n`,
                    '<div class="periphBody">\n',
                    renderer.body.join(""),
                    '</div>\n',
                    '</div>\n',
                ].join("");
        }
    );
};

module.exports = PeripheralDocument;
