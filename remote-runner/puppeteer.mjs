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

async function run(browser, url, skipUntilChapter, saveAs) {
    const extensionPage = await browser.newPage();
    extensionPage.on('console', (msg) => console.log(msg.text()));

    let manualTimeoutId;
    const manualSignalPromise = new Promise((resolve) => {
        manualTimeoutId = setTimeout(() => resolve('timeout'), AUTO_TIMEOUT);
    });

    // Expose a function to manually signal completion
    const signalCompletePromise = new Promise((resolve) => {
        extensionPage.exposeFunction('signalComplete', async () => {
            console.log('Closed manually\n');
            clearTimeout(manualTimeoutId);
            await extensionPage.close();
            resolve('manual');
        });
    });

    const maxFetch = process.env.MAX_PAGE_FETCH || "4";
    const skipImages = process.env.SKIP_IMAGES || "true";
    const manualDelay = process.env.MANUAL_DELAY_PER_CHAPTER || "0";
    console.log("Running with params max fetch: " + maxFetch + ", skip images: " + skipImages + ", manual delay: " + manualDelay);

    // Prepare query parameters for the extension page
    const params = new URLSearchParams({
        url: encodeURIComponent(url),
        skipUntilChapter: encodeURIComponent(skipUntilChapter),
        saveAs: encodeURIComponent(saveAs),
        maxFetch: encodeURIComponent(maxFetch),
        skipImages: encodeURIComponent(skipImages),
        manualDelay: encodeURIComponent(manualDelay),
    });

    const encoded = params.toString();
    await extensionPage.goto(`chrome-extension://${EXT_ID}/popup.html?id=123&${encoded}`);

    // Wait for either the manual signal or the auto timeout
    const result = await Promise.race([manualSignalPromise, signalCompletePromise]);

    if (result === 'timeout') {
        console.log('Had to auto-close extension page');
        await extensionPage.close();
    }
}

async function closeBrowser(browser) {
    await browser.close();
}

export {createBrowser, run, closeBrowser};
