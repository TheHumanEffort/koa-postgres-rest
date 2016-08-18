FROM node:6.3

RUN npm install -g nodemon

RUN mkdir -p /application
WORKDIR /application

ENV PORT 8080
EXPOSE 8080

COPY package.json /application
RUN npm install
COPY . /application

CMD [ "npm", "run", "dev" ]
