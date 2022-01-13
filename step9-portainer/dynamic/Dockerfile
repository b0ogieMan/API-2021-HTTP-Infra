FROM node:alpine

WORKDIR /opt/app

COPY --chown=node:node ./content/package*.json ./

RUN npm install

COPY --chown=node:node ./content .

USER node

ENTRYPOINT [ "node", "server.js" ]
