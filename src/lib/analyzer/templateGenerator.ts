import type { BatchAnalysisResult, ConsensusModel } from './types';

const LOREM_FULL = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
const LOREM_MEDIUM = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
const LOREM_SHORT = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor.';
const LOREM_LIST = [
    'Lorem ipsum dolor sit amet.',
    'Consetetur sadipscing elitr.',
    'Sed diam nonumy eirmod tempor.',
];

const SCRIPT_URL = 'https://tekura.desire2learn.com/shared/refresh_template/js/idoc_scripts.js';

/**
 * Generates a complete HTML template string from a BatchAnalysisResult.
 *
 * The template is a component catalogue presenting each consensus structural
 * element type once in logical order. It is NOT a recreation of any single
 * lesson page.
 *
 * @param batchResult - The complete output from analyzeFiles()
 * @returns A fully valid HTML string ready to open in a browser
 */
export function generateTemplate(batchResult: BatchAnalysisResult): string {
    const templateVersion = batchResult.templateVersion ?? '9-10';
    const moduleCode = batchResult.moduleCode.code;
    const consensus = batchResult.consensus;

    const head = buildHead(templateVersion, moduleCode);
    const header = buildHeader(moduleCode, batchResult);
    const bodySections = buildBodySections(consensus);
    const bodyContent = bodySections.join('\n<hr>\n');
    const footer = buildFooter();
    const acks = buildAcknowledgements();

    const lines = [
        '<!DOCTYPE html>',
        `<html lang="en" template="${templateVersion}" class="notranslate" translate="no">`,
        head,
        '<body>',
        `    <div id="header">`,
        header,
        `    </div>`,
        `    <div id="body">`,
        bodyContent,
        `    </div>`,
        footer,
        acks,
        '</body>',
        '</html>',
    ];

    return lines.join('\n');
}

function buildHead(templateVersion: string, moduleCode: string): string {
    return [
        '<head>',
        '    <meta charset="UTF-8">',
        '    <meta http-equiv="X-UA-Compatible" content="IE=edge">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        `    <title>0.0 ${moduleCode} - Module Title Lorem Ipsum</title>`,
        '    <script src="stickyNav.js"></script>',
        `    <script src="${SCRIPT_URL}"></script>`,
        '</head>',
    ].join('\n');
}

function buildHeader(moduleCode: string, batchResult: BatchAnalysisResult): string {
    const menuContent = buildModuleMenuContent(batchResult);

    return [
        '        <div id="module-code">',
        `            <h1>${moduleCode}</h1>`,
        '        </div>',
        '        <h1><span>Module Title Lorem Ipsum Dolor Sit Amet</span></h1>',
        '        <div id="module-head-buttons">',
        '            <div id="module-menu-button" class="circle-button btn1"></div>',
        '        </div>',
        '        <div id="module-menu-content" class="moduleMenu">',
        menuContent,
        '        </div>',
    ].join('\n');
}

function buildModuleMenuContent(batchResult: BatchAnalysisResult): string {
    if (batchResult.moduleMenu) {
        return batchResult.moduleMenu.processedHTML;
    }

    // Generate fallback lesson-page module menu
    return [
        '            <div class="row">',
        '                <div class="col-md-8 col-12">',
        '                    <h5>We are learning:</h5>',
        '                    <ul>',
        `                        <li>${LOREM_LIST[0]}</li>`,
        `                        <li>${LOREM_LIST[1]}</li>`,
        `                        <li>${LOREM_LIST[2]}</li>`,
        '                    </ul>',
        '                    <h5>I can:</h5>',
        '                    <ul>',
        `                        <li>${LOREM_LIST[0]}</li>`,
        `                        <li>${LOREM_LIST[1]}</li>`,
        `                        <li>${LOREM_LIST[2]}</li>`,
        '                    </ul>',
        '                </div>',
        '            </div>',
    ].join('\n');
}

function buildBodySections(consensus: ConsensusModel): string[] {
    const sections: string[] = [];
    let activityLetter = 0; // 0=A, 1=B, 2=C

    // (a) Heading Hierarchy
    if (consensus.headingLevels.length > 0) {
        const headings = consensus.headingLevels
            .map(level => `        <${level}>Heading ${level.toUpperCase()}</${level}>`)
            .join('\n');
        sections.push([
            '    <div class="row">',
            '        <div class="col-12">',
            headings,
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (b) Paragraph
    if (hasConsensusPattern(consensus, 'paragraph')) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Paragraph</h4>',
            '        </div>',
            '        <div class="col-md-8 col-12">',
            '            <p>Lorem ipsum dolor sit amet, <a href="" target="_blank">consectetur adipisicing</a> elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>',
            '            <p><b>Lorem ipsum dolor sit amet,</b> <i>consetetur sadipscing elitr,</i> <b><i>sed diam nonumy eirmod tempor</i></b> invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.</p>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (c) Paragraph with Sidebar Image
    if (consensus.hasSidebarImage) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Paragraph with Sidebar Image</h4>',
            '        </div>',
            '    </div>',
            '    <div class="row">',
            '        <div class="col-md-8 col-12">',
            '            <h2>Heading H2</h2>',
            '            <p><i>Subtitle lorem ipsum dolor sit amet.</i></p>',
            `            <p>${LOREM_MEDIUM}</p>`,
            '        </div>',
            '        <div class="col-md-4 offset-md-0 col-12">',
            '            <img class="img-fluid" src="https://placehold.co/600x400?text=Sidebar+Image" alt="Placeholder image">',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (d) Quote Text
    if (consensus.hasQuoteText) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>.quoteText - .quoteAck</h4>',
            '        </div>',
            '        <div class="col-md-8 col-12">',
            `            <p class="quoteText">${LOREM_FULL}</p>`,
            '            <p class="quoteAck">\u2014 Lorem Ipsum</p>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (e) Unordered List
    if (consensus.hasUnorderedLists) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Unordered List</h4>',
            '        </div>',
            '        <div class="col-md-8 col-12">',
            '            <ul>',
            `                <li>${LOREM_LIST[0]}</li>`,
            `                <li>${LOREM_LIST[1]}</li>`,
            `                <li>${LOREM_LIST[2]}</li>`,
            '            </ul>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (f) Ordered List
    if (consensus.hasOrderedLists) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Ordered List</h4>',
            '        </div>',
            '        <div class="col-md-8 col-12">',
            '            <ol>',
            `                <li>${LOREM_LIST[0]}</li>`,
            `                <li>${LOREM_LIST[1]}</li>`,
            `                <li>${LOREM_LIST[2]}</li>`,
            '            </ol>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (g) Table
    if (consensus.hasTables) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Generic Table</h4>',
            '        </div>',
            '        <div class="col-md-8 col-12">',
            '            <div class="table-responsive">',
            '                <table class="table">',
            '                    <thead>',
            '                        <tr>',
            '                            <th>Lorem</th>',
            '                            <th>Ipsum</th>',
            '                            <th>Dolor</th>',
            '                        </tr>',
            '                    </thead>',
            '                    <tbody>',
            '                        <tr>',
            '                            <td>lorem ipsum</td>',
            '                            <td>recusandae</td>',
            '                            <td>autem</td>',
            '                        </tr>',
            '                        <tr>',
            '                            <td>consectetur</td>',
            '                            <td>adipisicing</td>',
            '                            <td>elit</td>',
            '                        </tr>',
            '                        <tr>',
            '                            <td>sed do</td>',
            '                            <td>eiusmod</td>',
            '                            <td>tempor</td>',
            '                        </tr>',
            '                    </tbody>',
            '                </table>',
            '            </div>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (h) Images
    if (consensus.hasImages) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Images</h4>',
            '        </div>',
            '    </div>',
            '    <div class="row flex-end">',
            '        <div class="col-md-8 col-12">',
            '            <img class="img-fluid" src="https://placehold.co/1280x720?text=Image+Placeholder" alt="Placeholder image">',
            '        </div>',
            '        <div class="col-md-2 offset-md-0 col-6 offset-3 paddingL">',
            '            <p class="captionText">Caption text placeholder.</p>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (i) Video
    if (consensus.hasVideoSection) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Video</h4>',
            '        </div>',
            '    </div>',
            '    <div class="row">',
            '        <div class="col-md-8 col-12">',
            '            <div class="videoSection icon ratio ratio-16x9">',
            '                <iframe class="embed-responsive-item" height="339" src="https://player.vimeo.com/video/317381854" frameborder="0" allowfullscreen></iframe>',
            '            </div>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (j) Alerts
    if (consensus.alertVariants.length > 0) {
        const alertLabel = [
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Alerts</h4>',
            '        </div>',
            '    </div>',
        ].join('\n');

        const alertBlocks = consensus.alertVariants.map(variant => {
            const cssClasses = alertVariantToClasses(variant);
            return [
                '    <div class="row">',
                '        <div class="col-md-8 col-12">',
                `            <div class="${cssClasses}">`,
                '                <div class="row">',
                '                    <div class="col-12">',
                `                        <p>${LOREM_SHORT}</p>`,
                '                    </div>',
                '                </div>',
                '            </div>',
                '        </div>',
                '    </div>',
            ].join('\n');
        });

        sections.push(alertLabel + '\n' + alertBlocks.join('\n'));
    }

    // (k) Sidebar with alertActivity
    if (consensus.hasSidebarAlertActivity) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Sidebar Alert Activity</h4>',
            '        </div>',
            '    </div>',
            '    <div class="row">',
            '        <div class="col-md-8 col-12">',
            `            <p>${LOREM_FULL}</p>`,
            '        </div>',
            '        <div class="col-md-4 offset-md-0 col-12">',
            '            <div class="alertActivity">',
            '                <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>',
            '            </div>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (l) Activity — standard
    if (consensus.activityTypes.includes('standard')) {
        const num = `1${String.fromCharCode(65 + activityLetter)}`;
        activityLetter++;
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Activity</h4>',
            '        </div>',
            '    </div>',
            '    <div class="row">',
            '        <div class="col-md-8 col-12">',
            `            <div class="activity alertPadding" number="${num}">`,
            '                <div class="row">',
            '                    <div class="col-12">',
            '                        <h3>Activity heading H3</h3>',
            `                        <p>${LOREM_FULL}</p>`,
            '                        <a href="" target="_blank"><div class="button">Go to workbook</div></a>',
            '                    </div>',
            '                </div>',
            '            </div>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (m) Activity — interactive
    if (consensus.activityTypes.includes('interactive')) {
        const num = `1${String.fromCharCode(65 + activityLetter)}`;
        activityLetter++;
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Activity (Interactive)</h4>',
            '        </div>',
            '    </div>',
            '    <div class="row">',
            '        <div class="col-12">',
            `            <div class="activity interactive" number="${num}">`,
            '                <div class="row">',
            '                    <div class="col-md-12">',
            '                        <h3>Activity heading H3 (Interactive)</h3>',
            '                    </div>',
            '                    <div class="col-md-8 col-12">',
            `                        <p>${LOREM_FULL}</p>`,
            '                    </div>',
            '                </div>',
            '            </div>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (n) Activity — dropbox
    if (consensus.activityTypes.includes('dropbox')) {
        const num = `1${String.fromCharCode(65 + activityLetter)}`;
        activityLetter++;
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Activity (Dropbox)</h4>',
            '        </div>',
            '    </div>',
            '    <div class="row">',
            '        <div class="col-md-8 col-12">',
            `            <div class="activity alertPadding dropbox" number="${num}">`,
            '                <div class="row">',
            '                    <div class="col-12">',
            '                        <h3>Dropbox Assessment</h3>',
            `                        <p>${LOREM_FULL}</p>`,
            '                        <a href="" target="_self"><div class="button">Upload to dropbox</div></a>',
            '                    </div>',
            '                </div>',
            '            </div>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (o) Buttons
    if (consensus.hasButtons) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>Button</h4>',
            '        </div>',
            '        <div class="col-md-8 col-12">',
            '            <a href="" target="_blank"><div class="button">Lorem ipsum dolor</div></a>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    // (p) External Buttons
    if (consensus.hasExternalButtons) {
        sections.push([
            '    <div class="row">',
            '        <div class="col-md-12">',
            '            <h4>External Button</h4>',
            '        </div>',
            '        <div class="col-md-8 col-12">',
            '            <div class="externalButton">',
            '                <a href="" target="_blank">Lorem ipsum dolor sit amet</a>',
            '            </div>',
            '        </div>',
            '    </div>',
        ].join('\n'));
    }

    return sections;
}

function buildFooter(): string {
    return [
        '    <div id="footer">',
        '        <ul class="footer-nav">',
        '            <li><a id="prev-lesson" href="">Prev</a></li>',
        '            <li><a class="home-nav" href="">Home</a></li>',
        '            <li><a id="next-lesson" href="">Next</a></li>',
        '        </ul>',
        '    </div>',
    ].join('\n');
}

function buildAcknowledgements(): string {
    return [
        '    <div class="row">',
        '        <div class="col-md-8 col-12">',
        '            <div class="acks">',
        '                <div class="accordion">',
        '                    <div class="accHead">',
        '                        <h4>Acknowledgements</h4>',
        '                    </div>',
        '                    <div class="accContent">',
        '                        <div class="acksLesson">',
        '                            <p><i>Every effort has been made to acknowledge and contact copyright holders. Te Aho o Te Kura Pounamu apologises for any omissions and welcomes more accurate information.</i></p>',
        '                        </div>',
        '                        <div class="acksLesson">',
        '                            <p>Photo: Placeholder, 00000, Shutterstock Images LLC, USA. Used by permission.</p>',
        '                            <p>Photo: Placeholder, 00000, BigstockPhoto Inc., USA. Used by permission.</p>',
        '                            <p>Photo: Placeholder, iStock 00000, Getty Images. Used with permission.</p>',
        '                        </div>',
        '                        <div class="acksLesson">',
        '                            <p>Illustration: Placeholder, iStock 00000, Getty Images. Used with permission.</p>',
        '                            <p>Video: Placeholder, Uploader, retrieved from <a href="https://www.youtube.com/watch?v=PlaceholderCode" target="_blank">https://www.youtube.com/watch?v=PlaceholderCode</a>. Used in online teaching within exception for education.</p>',
        '                        </div>',
        '                        <div class="acksLesson">',
        '                            <p>All illustrations \u00a9 Te Aho o Te Kura Pounamu, Wellington, New Zealand.</p>',
        '                        </div>',
        '                        <div class="acksLesson">',
        '                            <p><i>Copyright \u00a9 <span class="currentYear"></span> Board of Trustees of Te Aho o Te Kura Pounamu, Private Bag 39992, Wellington Mail Centre, Lower Hutt 5045, New Zealand. All rights reserved. No part of this publication may be reproduced or transmitted in any form or by any means without the written permission of Te Aho o Te Kura Pounamu.</i></p>',
        '                        </div>',
        '                    </div>',
        '                </div>',
        '            </div>',
        '        </div>',
        '    </div>',
    ].join('\n');
}

/**
 * Checks if a pattern ID exists in the consensus patterns.
 */
function hasConsensusPattern(consensus: ConsensusModel, patternId: string): boolean {
    return consensus.consensusPatterns.some(p => p.id === patternId);
}

/**
 * Converts an alertVariant string to CSS class string.
 *
 * Alert variants from consensus are formatted as:
 *   'alert' → class="alert"
 *   'alert.solid' → class="alert solid"
 *   'alert.top' → class="alert top"
 *   'alert.blank' → class="alert blank"
 */
function alertVariantToClasses(variant: string): string {
    if (variant === 'alert') return 'alert';
    // Convert 'alert.solid' to 'alert solid', etc.
    return variant.replace('.', ' ');
}
