import express from 'express';
import {createBrowser, run, closeBrowser, RunResult} from './puppeteer.mjs'; // Adjust path as needed
import * as fs from 'fs/promises';
import * as path from 'node:path';

const app = express();
const PORT = process.env.PORT !== undefined && !isNaN(parseInt(process.env.PORT)) ?
    parseInt(process.env.PORT) : 8080;
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/Users/truef/Downloads/'


// Initialize BrowserRunner
let browserCtx;

(async () => {
    browserCtx = await createBrowser()
})();

// Endpoint for checking if new chapters are available
app.get('/check', express.json(), async (req, res) => {
    const {url, skipUntilChapter} = req.query;

    // Validate input
    if (!url) {
        return res.status(400).json({error: 'Missing required parameters: url or skipUntilChapter'});
    }

    try {
        // Run the BrowserRunner
        const result = await run(browserCtx, url, skipUntilChapter);
        if (result === RunResult.TIMEOUT) {
            return res.status(500).json({error: 'Timeout while running the browser'});
        }
        if (result === RunResult.NO_UPDATE) {
            return res.status(200).json({message: 'No update available', update: false});
        }

        // New chapters are available
        res.status(200).json({message: 'New chapters available', update: true});
    } catch (error) {
        console.error('Error during BrowserRunner execution:', error);
        res.status(500).json({error: 'Error running the browser or processing the request'});
    }
});

// Endpoint for downloading
app.post('/run', express.json(), async (req, res) => {
    const {url, skipUntilChapter, id} = req.body;

    // Validate input
    if (!url || !id) {
        return res.status(400).json({error: 'Missing required parameters: url, skipUntilChapter, or id'});
    }

    const saveAs = `${id}.epub`; // Filename for the generated file
    const outputPath = path.join(OUTPUT_DIR, saveAs);

    try {
        // Run the BrowserRunner
        const result = await run(browserCtx, url, skipUntilChapter, saveAs);
        if (result === RunResult.TIMEOUT) {
            return res.status(500).json({error: 'Timeout while running the browser'});
        }
        if (result === RunResult.NO_UPDATE) {
            return res.status(200).json({message: 'No update available', update:false});
        }

        // Check if the file was created
        const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
        if (!fileExists) {
            return res.status(500).json({error: 'File not generated or missing'});
        }
        // Send the file to the client
        res.sendFile(outputPath, err => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({error: 'Error sending the file'});
            } else {
                console.log(`File ${saveAs} successfully sent`);
            }
            // Delete file after sending:
            fs.unlink(outputPath).catch(console.error);
        });
    } catch (error) {
        console.error('Error during BrowserRunner execution:', error);
        res.status(500).json({error: 'Error running the browser or processing the request'});
    }
});

// Setup healthcheck at /health
app.get('/health', (req, res) => {
    res.send('OK');
});

// Gracefully close the browser on shutdown
process.on('SIGINT', async () => {
    await closeBrowser(browserCtx);
    process.exit();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
