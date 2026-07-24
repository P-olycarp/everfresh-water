#!/bin/bash
echo "Starting Everfresh Water Backend Deployment..."

# Install dependencies
npm install --production

# Run migrations (if any)
npm run migrate

# Start the server
npm start
