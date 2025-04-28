
# Use Node.js LTS as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the project files
COPY . .

# Expose port 5000 for the Express server
EXPOSE 5000

# Start the server
CMD ["npm", "run", "dev"]
