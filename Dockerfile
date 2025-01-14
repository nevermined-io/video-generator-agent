FROM node:20-alpine
LABEL maintainer="Nevermined <root@nevermined.io>"

RUN apk add --no-cache libc6-compat autoconf automake alpine-sdk xdg-utils gettext 
# Install dependencies based on the preferred package manager
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

# Rebuild the source code only when needed
COPY src ./src
COPY tsconfig.json ./

RUN yarn build

ENTRYPOINT [ "yarn", "start" ]