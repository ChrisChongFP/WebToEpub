# syntax=docker.io/docker/dockerfile:1

FROM node:18-bookworm AS base

# Install dependencies only when needed
#FROM base AS deps
#WORKDIR /app
#RUN apt update && sudo apt upgrade
#RUN apt install software-properties-common apt-transport-https ca-certificates && curl -y
#RUN curl -fSsL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor | tee /usr/share/keyrings/google-chrome.gpg >> /dev/null
#RUN echo deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main | sudo tee /etc/apt/sources.list.d/google-chrome.list

RUN apt-get update \
    && apt-get install -y dbus dbus-x11 \
    && mkdir -p /run/dbus && chmod -R 777 /run/dbus \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# If running Docker >= 1.13.0 use docker run's --init arg to reap zombie processes, otherwise
# uncomment the following lines to have `dumb-init` as PID 1
# ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_x86_64 /usr/local/bin/dumb-init
# RUN chmod +x /usr/local/bin/dumb-init
# ENTRYPOINT ["dumb-init", "--"]

# Uncomment to skip the Chrome for Testing download when installing puppeteer. If you do,
# you'll need to launch puppeteer with:
#     browser.launch({executablePath: 'google-chrome-stable'})
# ENV PUPPETEER_SKIP_DOWNLOAD true

# Install puppeteer so it's available in the container.

COPY package.json package-lock.json ./
COPY ./remote-runner ./remote-runner
COPY ./plugin ./plugin
COPY ./start.sh ./start.sh
RUN \
  if [ -f package-lock.json ]; then npm install; \
  else echo "Lockfile not found." && exit 1; \
  fi


RUN pwd
RUN ls -lah
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /node_modules \
    && chown -R pptruser:pptruser /package.json \
    && chown -R pptruser:pptruser /package-lock.json \
    && chown -R pptruser:pptruser /start.sh

# Run everything after as non-privileged user.
USER pptruser
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=8080
ENV OUTPUT_DIR="/home/pptruser/Downloads/"
ENV PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome-stable"
ENV DBUS_SESSION_BUS_ADDRESS=autolaunch:

CMD ["./start.sh"]

#FROM base AS browser
#WORKDIR /app
#COPY .puppeteerrc.cjs ./
#RUN npx puppeteer browsers install

#FROM base AS builder
#WORKDIR /app

#RUN addgroup --system --gid 1001 nodejs
#RUN adduser --system --uid 1001 server-user


#COPY --from=deps /app/node_modules ./node_modules
#COPY --chown=server-user:nodejs ./plugin ./plugin
#COPY --chown=server-user:nodejs ./remote-runner ./remote-runner
#COPY --chown=server-user:nodejs ./package*.json ./
#COPY --chown=server-user:nodejs ./.puppeteerrc.cjs ./
#COPY --from=browser --chown=server-user:nodejs /app/browsers ./browsers

