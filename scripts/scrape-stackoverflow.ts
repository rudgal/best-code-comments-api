import * as cheerio from 'cheerio';
import { readFileSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { chromium } from 'playwright';
import { unescape } from 'lodash';

const outputPath = resolve(process.cwd(), 'src/data/comments.csv');

// New function to encapsulate parsing logic
async function parseHtmlAndExtractAnswers(html: string, currentNextId: number, permalinkBase: string): Promise<{ answers: any[], nextId: number }> {
    const $ = cheerio.load(html);
    const answers: any[] = [];
    let nextId = currentNextId;

    const answerElements = $('div.answer.js-answer');

    answerElements.each((_idx, el) => {
        const votes = parseInt($(el).find('.js-vote-count').text().trim(), 10);
        const permalink = $(el).find('a.js-share-link').attr('href') ?? '';
        let author = '';
        const userDetails = $(el).find('.user-details').last();
        const userDetailsText = userDetails.text().trim();

        // Regex to capture the author name at the end of the string
        const regex = /(?:(?:\d+\s*revs(?:,\s*\d+\s*users)?\s*\d*%?)?\s*)?([a-zA-Z0-9\s._-]+)$/;
        const match = userDetailsText.match(regex);

        if (match && match[1]) {
            author = match[1].trim();
        } else {
            const lines = userDetailsText.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length > 0) {
                author = lines[lines.length - 1] ?? '';
            }
        }

        // Fallback for author if still empty
        if (!author) {
            author = "Anonymous";
        }

        const date = $(el).find('.user-action-time .relativetime').attr('title') ?? '';

        $(el).find('.js-post-body pre code').each((_j, codeEl) => {
            let content = $(codeEl).html()?.trim() ?? '';
            content = unescape(content); // Decode HTML entities using lodash.unescape
            if (content) {
                answers.push([ // Push an array of values
                    nextId++,
                    author,
                    date,
                    `${permalinkBase}${permalink}`,
                    votes,
                    '', // tags
                    content,
                ]);
            }
        });
    });

    return { answers, nextId };
}

async function scrapeStackOverflow() {
    const args = process.argv.slice(2);
    let htmlFilePaths: string[] = [];
    let baseUrl: string | undefined;

    if (args.length === 2 && args[0] === '--folder') {
        const folderPath = args[1];
        for (let i = 1; i <= 18; i++) {
            htmlFilePaths.push(`${folderPath}/page${i.toString().padStart(2, '0')}.html`);
        }
        console.log(`Scraping from local files: ${htmlFilePaths.join(', ')}`);
    } else if (args.length === 2 && args[0] === '--url') {
        baseUrl = args[1];
        console.log(`Scraping from URL: ${baseUrl}`);
    } else {
        console.log('Usage: bun run scripts/scrape-stackoverflow.ts --folder <path_to_html_files> OR --url <url_to_scrape>');
        process.exit(1);
    }

    let browser: any; // Playwright browser instance
    let page: any;     // Playwright page instance

    try {
        const existingCsv = readFileSync(outputPath, 'utf8');
        const records = parse(existingCsv, { columns: true, skip_empty_lines: true });
        const lastId = records.length > 0 ? Math.max(...records.map((r: any) => parseInt(r.id, 10)).filter((id: number) => !isNaN(id))) : 0;
        let nextId = (lastId > 0 ? lastId : 0) + 1;

        const allAnswers: any[] = [];

        if (baseUrl) {
            browser = await chromium.launch();
            page = await browser.newPage();

            let maxPage = 18; // Fallback in case auto-detection fails

            await page.goto(`${baseUrl}?page=1`);
            const firstPageHtml = await page.content();
            const $firstPage = cheerio.load(firstPageHtml);
            const lastPageLink = $firstPage('div.s-pagination a').last().prev();
            const lastPageNum = parseInt(lastPageLink.text(), 10);

            if (!isNaN(lastPageNum)) {
                maxPage = lastPageNum;
            }

            for (let i = 1; i <= maxPage; i++) {
                console.log(`Scraping page ${i}...`);
                await page.goto(`${baseUrl}?page=${i}`);
                const html = await page.content();

                const { answers, nextId: updatedNextId } = await parseHtmlAndExtractAnswers(html, nextId, baseUrl);
                allAnswers.push(...answers);
                nextId = updatedNextId;

                console.log(`Found ${answers.length} answer elements on page ${i}`);
            }
        } else if (htmlFilePaths.length > 0) {
            for (const filePath of htmlFilePaths) {
                console.log(`Processing ${filePath}...`);
                const html = readFileSync(resolve(process.cwd(), filePath), 'utf8');

                const { answers, nextId: updatedNextId } = await parseHtmlAndExtractAnswers(html, nextId, 'https://stackoverflow.com');
                allAnswers.push(...answers);
                nextId = updatedNextId;

                console.log(`Found ${answers.length} answer elements in ${filePath}`);
            }
        }

        // @ts-ignore
        const csvString = stringify(allAnswers, { header: false, quoted: [6] }); // Added quoted: [6] for content field
        appendFileSync(outputPath, csvString);

        console.log(`Successfully scraped and appended ${allAnswers.length} answers to ${outputPath}`);
    } catch (error) {
        console.error('Error scraping Stack Overflow:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

(async () => {
    await scrapeStackOverflow();
})();
