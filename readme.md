# WebToEpub as an API
David Teviotdale created a Chrome and Firefox extension which can package webnovels into .epub files.
This is an OSS project, but it is limited to being used in a browser. 

I wished to automate this process, including fetching particular novels at regular intervals. 
To solve this, I've used the Puppeteer testing library which simulates a headless browser.
We then load the extension, and attach a basic server to the browser instance.

Now we can query the server with a starting URL, chapter-to-start at, and an ID and it will return a .epub file.

The Docker image is debian based and the repsitory is setup to work with Helm and Helmfile. 
I am currently running this in Google Cloud's Kubernetes Engine.

In the future, I may try and just modify the source code enough to be ran as a standalone Node.js program,
without the need for a browser. However, just getting it usable with Puppeteer was a big enough task for now.

To run in an image: 

```bash
docker build -t webtoepub-api:latest .
docker run --publish 8080:8080 webtoepub-api:latest  
```

To deploy in Kubernetes,
modify the helmfile or helm values to set the image to the one you've built. 
Then run:

```bash
helmfile apply
```

## Start of the docs for the main extension's repository: 

https://github.com/dteviot/WebToEpub

## About The Project

![WebToEpub Screen Shot][product-screenshot]

&copy; 2015 David Teviotdale

WebToEpub is a browser extension for Firefox and Chrome that converts web novels and other web pages into EPUB format. It supports a wide range of websites, including:

- Baka-Tsuki.org
- ArchiveOfOurOwn.org
- FanFiction.net
- Wuxiaworld.com
- Royalroad.com and many more...

<p align="right">(<a href="#readme-top">back to top</a>)</p>