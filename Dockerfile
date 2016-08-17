FROM alpine:3.4
RUN apk add --update nodejs && chmod 755 /usr/lib/node_modules
WORKDIR /tmp
COPY . /app
WORKDIR /app
ENV NODE_PATH /usr/lib/node_modules
RUN npm install -g
ENTRYPOINT ["/usr/bin/javascriptd"]
