FROM public.ecr.aws/docker/library/node:18-slim
RUN apt-get update
RUN apt-get --assume-yes install bash git curl

SHELL ["/bin/bash", "-c"]
ENV FOUNDRY_RELEASE_TAG=0.2.0-70f4fb55fa87e0e980f7f9fcccc5429bb1a48dbe
ENV FOUNDRY_RELEASE_URL="https://github.com/manifoldxyz/foundry-bin/releases/download/${FOUNDRY_RELEASE_TAG}/"
ENV FOUNDRY_BIN_TARBALL_URL="${FOUNDRY_RELEASE_URL}foundry_nightly_linux_amd64.tar.gz"
ENV FOUNDRY_MAN_TARBALL_URL="${FOUNDRY_RELEASE_URL}foundry_nightly_linux_amd64.tar.gz"
RUN mkdir -p /root/.foundry/bin
RUN mkdir -p /root/.foundry/share/man/man1
RUN curl -# -L $FOUNDRY_BIN_TARBALL_URL | tar -xzC /root/.foundry/bin
RUN curl -# -L $FOUNDRY_MAN_TARBALL_URL | tar -xzC /root/.foundry/share/man/man1
ENV PATH="${PATH}:/root/.foundry/bin"
RUN echo >> /root/.bashrc && echo "export PATH=\"\$PATH:/root/.foundry/bin\"" >> /root/.bashrc

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY . .
RUN yarn install
RUN yarn build

ENTRYPOINT ["yarn", "start"]