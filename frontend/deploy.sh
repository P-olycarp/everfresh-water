#!/bin/bash
echo "Building Everfresh Water Frontend..."

# Install dependencies
npm install

# Build for production
npm run build

echo "Build complete! Dist folder ready for deployment."
