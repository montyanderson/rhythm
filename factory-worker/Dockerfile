FROM node:buster

RUN apt-get update; apt-get upgrade -y;

RUN apt-get install ffmpeg python3 -y;

RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python3 get-pip.py;

RUN pip3 install spleeter

WORKDIR /app

COPY ./config.json .

COPY package.json .

RUN npm install

COPY . .

CMD [ "node", "index.js" ]
