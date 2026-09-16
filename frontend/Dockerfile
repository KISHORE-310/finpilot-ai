FROM node:18-alpine

WORKDIR /app

# Copy package management files
COPY package.json package-lock.json* ./

RUN npm install

# Copy application source
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "run", "dev"]
