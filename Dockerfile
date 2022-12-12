# Install dependencies only when needed
FROM node:16-alpine AS builder

RUN apk update
RUN apk add bash git curl --no-cache

RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN npm install 

# Foundry
SHELL ["/bin/bash", "-c"]
ENV FOUNDRY_RELEASE_TAG=0.2.0-70f4fb55fa87e0e980f7f9fcccc5429bb1a48dbe
ENV FOUNDRY_RELEASE_URL="https://github.com/manifoldxyz/foundry-bin/releases/download/${FOUNDRY_RELEASE_TAG}/"
ENV FOUNDRY_BIN_TARBALL_URL="${FOUNDRY_RELEASE_URL}foundry_nightly_linux_amd64.tar.gz"
ENV FOUNDRY_MAN_TARBALL_URL="${FOUNDRY_RELEASE_URL}foundry_nightly_linux_amd64.tar.gz"
RUN mkdir -p $HOME/.foundry/bin
RUN mkdir -p $HOME/.foundry/share/man/man1
RUN curl -# -L $FOUNDRY_BIN_TARBALL_URL | tar -xzC /root/.foundry/bin
RUN curl -# -L $FOUNDRY_MAN_TARBALL_URL | tar -xzC /root/.foundry/share/man/man1
RUN echo >> /etc/profile && echo "export PATH=\"\$PATH:/root/.foundry/bin\"" >> /etc/profile

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

FROM node:16-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app ./
COPY --chown=nextjs:nodejs --from=builder /app/ ./

USER nextjs

CMD ["npm", "run", "start"]
