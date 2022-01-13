FROM node:16

RUN apt-get update && \
    apt-get install -y vim

COPY content/ /opt/app

CMD ["node", "/opt/app/index.js"]
