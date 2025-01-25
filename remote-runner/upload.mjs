import express from 'express';
import {createBrowser, run, closeBrowser} from './puppeteer.mjs'; // Adjust path as needed
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

// Endpoint definition
app.post('/run', express.json(), async (req, res) => {
    const {url, skipUntilChapter, id} = req.body;

    // Validate input
    if (!url || !skipUntilChapter || !id) {
        return res.status(400).json({error: 'Missing required parameters: url, skipUntilChapter, or id'});
    }

    const saveAs = `${id}.epub`; // Filename for the generated file
    const outputPath = path.join(OUTPUT_DIR, saveAs);

    try {
        // Run the BrowserRunner
        await run(browserCtx, url, skipUntilChapter, saveAs);

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
