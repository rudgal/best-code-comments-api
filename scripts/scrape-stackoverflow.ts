
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const baseUrl = 'https://stackoverflow.com/questions/184618/what-is-the-best-comment-in-source-code-you-have-ever-encountered';

interface Answer {
    votes: number;
    content: string;
    permalink: string;
    author: string;
    date: string;
}

async function scrapeStackOverflow() {
    try {
        const answers: Answer[] = [];
        let maxPage = 18; // Fallback in case auto-detection fails

        const firstPageResponse = await fetch(`${baseUrl}?page=1`);
        const firstPageHtml = await firstPageResponse.text();
        const $firstPage = cheerio.load(firstPageHtml);
        const lastPageLink = $firstPage('div.s-pagination a').last().prev();
        const lastPageNum = parseInt(lastPageLink.text(), 10);

        if (!isNaN(lastPageNum)) {
            maxPage = lastPageNum;
        }

        for (let i = 1; i <= maxPage; i++) {
            console.log(`Scraping page ${i}...`);
            const response = await fetch(`${baseUrl}?page=${i}`);
            const html = await response.text();
            const $ = cheerio.load(html);

            $('div.answer.js-answer').each((i, el) => {
                const votes = parseInt($(el).find('.js-vote-count').text().trim(), 10);
                const permalink = $(el).find('a.js-share-link').attr('href') ?? '';
                let author = $(el).find('.user-details a[href*="/users/"]').last().text().trim();
                if (!author) {
                    author = $(el).find('.user-details').last().text().trim();
                }
                const date = $(el).find('.user-action-time .relativetime').attr('title') ?? '';

                $(el).find('.js-post-body pre code').each((j, codeEl) => {
                    const content = $(codeEl).html()?.trim() ?? '';
                    if (content) {
                        answers.push({
                            votes,
                            content,
                            permalink: `https://stackoverflow.com${permalink}`,
                            author,
                            date,
                        });
                    }
                });
            });
        }

        const outputPath = resolve(process.cwd(), 'src/data/stackoverflow-comments.json');
        writeFileSync(outputPath, JSON.stringify(answers, null, 2));

        console.log(`Successfully scraped ${answers.length} answers from ${maxPage} pages and saved to ${outputPath}`);
    } catch (error) {
        console.error('Error scraping Stack Overflow:', error);
    }
}

scrapeStackOverflow();
