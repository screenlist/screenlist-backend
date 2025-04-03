# Specify the base image
FROM node:22

# Set the working directory in the Docker container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (if necessary)
RUN npm run build

# Expose the port the app runs on
EXPOSE 8090

# Command to run the application
CMD ["node", "dist/main"]
