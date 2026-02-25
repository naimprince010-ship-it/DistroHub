// Create PWA Icons Script
// Run: node scripts/create-pwa-icons.js
// Creates SVG icons (can be converted to PNG)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');

// Simple SVG to use as base
function createIconSVG(size, text = 'DH') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" fill="#4F46E5" rx="${size * 0.15}"/>
  
  <!-- 3D Cube Icon -->
  <g transform="translate(${size * 0.25}, ${size * 0.2})">
    <!-- Front face -->
    <path d="M ${size * 0.15} ${size * 0.1} L ${size * 0.35} ${size * 0.2} L ${size * 0.35} ${size * 0.4} L ${size * 0.15} ${size * 0.3} Z" 
          fill="rgba(255, 255, 255, 0.95)"/>
    <!-- Top face -->
    <path d="M ${size * 0.15} ${size * 0.1} L ${size * 0.35} ${size * 0.2} L ${size * 0.5} ${size * 0.1} L ${size * 0.3} 0 Z" 
          fill="rgba(255, 255, 255, 0.75)"/>
    <!-- Right face -->
    <path d="M ${size * 0.35} ${size * 0.2} L ${size * 0.5} ${size * 0.1} L ${size * 0.5} ${size * 0.3} L ${size * 0.35} ${size * 0.4} Z" 
          fill="rgba(255, 255, 255, 0.85)"/>
  </g>
  
  <!-- Text -->
  <text x="${size / 2}" y="${size * 0.7}" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.2}" 
        font-weight="bold" 
        fill="#FFFFFF" 
        text-anchor="middle" 
        dominant-baseline="middle">${text}</text>
</svg>`;
}

// Try to use canvas if available, otherwise create SVG
function createIcons() {
  console.log('🎨 Creating PWA icons...\n');
  
  try {
    // Try to use node-canvas if available
    const { createCanvas } = require('canvas');
    
    function createPNGIcon(size) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Background
      ctx.fillStyle = '#4F46E5';
      ctx.roundRect(0, 0, size, size, size * 0.15);
      ctx.fill();
      
      // Cube icon
      const centerX = size / 2;
      const centerY = size / 2;
      const cubeSize = size * 0.3;
      
      // Front face
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.moveTo(centerX - cubeSize/2, centerY - cubeSize/4);
      ctx.lineTo(centerX + cubeSize/2, centerY - cubeSize/4 + cubeSize/4);
      ctx.lineTo(centerX + cubeSize/2, centerY + cubeSize/2 + cubeSize/4);
      ctx.lineTo(centerX - cubeSize/2, centerY + cubeSize/2);
      ctx.closePath();
      ctx.fill();
      
      // Top face
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.moveTo(centerX - cubeSize/2, centerY - cubeSize/4);
      ctx.lineTo(centerX + cubeSize/2, centerY - cubeSize/4 + cubeSize/4);
      ctx.lineTo(centerX + cubeSize, centerY - cubeSize/4);
      ctx.lineTo(centerX, centerY - cubeSize/2);
      ctx.closePath();
      ctx.fill();
      
      // Right face
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(centerX + cubeSize/2, centerY - cubeSize/4 + cubeSize/4);
      ctx.lineTo(centerX + cubeSize, centerY - cubeSize/4);
      ctx.lineTo(centerX + cubeSize, centerY + cubeSize/2);
      ctx.lineTo(centerX + cubeSize/2, centerY + cubeSize/2 + cubeSize/4);
      ctx.closePath();
      ctx.fill();
      
      // Text
      if (size >= 192) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${size * 0.18}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DH', centerX, centerY + cubeSize);
      }
      
      return canvas.toBuffer('image/png');
    }
    
    // Create PNG files
    const icon192 = createPNGIcon(192);
    const icon512 = createPNGIcon(512);
    
    fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);
    fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);
    
    console.log('✅ Created PNG icons using canvas');
    console.log('   - pwa-192x192.png');
    console.log('   - pwa-512x512.png');
    
  } catch (error) {
    // Fallback: Create SVG files
    console.log('⚠️  Canvas not available, creating SVG files instead...');
    console.log('   (You can convert SVG to PNG using online tools)\n');
    
    const svg192 = createIconSVG(192);
    const svg512 = createIconSVG(512);
    
    fs.writeFileSync(path.join(publicDir, 'pwa-192x192.svg'), svg192);
    fs.writeFileSync(path.join(publicDir, 'pwa-512x512.svg'), svg512);
    
    console.log('✅ Created SVG icons:');
    console.log('   - pwa-192x192.svg');
    console.log('   - pwa-512x512.svg');
    console.log('\n💡 To convert to PNG:');
    console.log('   1. Use online tool: https://cloudconvert.com/svg-to-png');
    console.log('   2. Or use the HTML generator: public/create-icons-simple.html');
  }
  
  console.log('\n📁 Files created in: distrohub-frontend/public/');
  console.log('✅ Ready to build and deploy!');
}

// Run
createIcons();
