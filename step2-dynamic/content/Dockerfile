FROM node:alpine

WORKDIR /opt/app

COPY --chown=node:node package*.json .

RUN npm install

COPY --chown=node:node . .

USER node

ENTRYPOINT [ "node", "server.js" ]
