import puppeteer, {Browser} from 'puppeteer';
import * as path from 'node:path';

const EXT_ID = 'kdcgkpnnoojpgihipahlkpgoeomhlobi';
const PATH_TO_EXTENSION = path.join(process.cwd(), 'plugin');
const AUTO_TIMEOUT = 45 * 1000;

async function createBrowser() {
    return await puppeteer.launch({
        timeout: 0, // Slow boot on containers
        headless: true,
        args: [
            `--disable-extensions-except=${PATH_TO_EXTENSION}`,
            `--load-extension=${PATH_TO_EXTENSION}`,
            '--no-sandbox', '--disable-setuid-sandbox',
        ],
        dumpio: true,
    });
}

const RunResult = Object.freeze({
    TIMEOUT: Symbol('timeout'),
    DOWNLOAD: Symbol('manual'),
    NO_UPDATE: Symbol('no-update'),
});


async function run(browser, url, skipUntilChapter, saveAs) {
    const extensionPage = await browser.newPage();
    if (process.env.DEBUG === "true") {
        extensionPage.on('console', (msg) => console.log(msg.text()));
    }

    let manualTimeoutId;
    const timeoutPromise = new Promise((resolve) => {
        manualTimeoutId = setTimeout(() => resolve(RunResult.TIMEOUT), AUTO_TIMEOUT);
    });

    // Expose a function to manually signal completion
    const signalCompletePromise = new Promise((resolve) => {
        extensionPage.exposeFunction('signalComplete', async () => {
            console.log('Closed manually\n');
            clearTimeout(manualTimeoutId);
            resolve(RunResult.DOWNLOAD);
        });
    });

    const signalNoUpdatePromise = new Promise((resolve) => {
        extensionPage.exposeFunction('signalNoUpdate', async () => {
            console.log('Closed manually with no update\n');
            clearTimeout(manualTimeoutId);
            resolve(RunResult.NO_UPDATE);
        });
    });


    const maxFetch = process.env.MAX_PAGE_FETCH || "4";
    const skipImages = process.env.SKIP_IMAGES || "true";
    const manualDelay = process.env.MANUAL_DELAY_PER_CHAPTER || "0";
    console.log("Running with params max fetch: " + maxFetch + ", skip images: " + skipImages + ", manual delay: " + manualDelay);

    // Prepare query parameters for the extension page
    const params = new URLSearchParams({
        url: encodeURIComponent(url),
        maxFetch: encodeURIComponent(maxFetch),
        skipImages: encodeURIComponent(skipImages),
        manualDelay: encodeURIComponent(manualDelay),
    });
    if (skipUntilChapter) {
        params.append('skipUntilChapter', encodeURIComponent(skipUntilChapter));
    }
    if (saveAs) {
        params.append('saveAs', encodeURIComponent(saveAs));
    }

    const encoded = params.toString();
    await extensionPage.goto(`chrome-extension://${EXT_ID}/popup.html?id=123&${encoded}`);

    // Wait for either the manual signal or the auto timeout
    const result = await Promise.race([timeoutPromise, signalCompletePromise, signalNoUpdatePromise]);

    if (result === RunResult.TIMEOUT) {
        console.log('Had to auto-close extension page');
    }
    await extensionPage.close();
    return result;
}

async function closeBrowser(browser) {
    await browser.close();
}

export {createBrowser, run, closeBrowser, RunResult};
