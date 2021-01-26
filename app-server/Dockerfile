FROM node:latest

WORKDIR /app

COPY ./config.json .

COPY package.json .

RUN npm install

COPY . .

CMD [ "node", "index.js" ]
