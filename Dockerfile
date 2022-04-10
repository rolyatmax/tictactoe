FROM node:14-slim

WORKDIR /app
COPY . .
RUN npm install

WORKDIR /app/public
RUN npm install
RUN npm run build

WORKDIR /app
CMD [ "npm", "start" ]
