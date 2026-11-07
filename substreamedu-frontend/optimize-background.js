const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeBackground() {
    const inputPath = path.join(__dirname, 'public', 'background.png');
    const outputDir = path.join(__dirname, 'public', 'optimized');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const sizes = [
        { width: 1920, height: 1080, suffix: 'desktop', dpr: [1, 2] },
        { width: 1366, height: 768, suffix: 'laptop', dpr: [1, 2] },
        { width: 768, height: 1024, suffix: 'tablet', dpr: [1, 2] },
        { width: 375, height: 667, suffix: 'mobile', dpr: [1, 2] }
    ];

    try {
        const inputStats = fs.statSync(inputPath);
        console.log(`📊 Original image size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB\n`);

        for (const size of sizes) {
            for (const dpr of size.dpr) {
                const actualWidth = size.width * dpr;
                const actualHeight = size.height * dpr;
                const dprSuffix = dpr > 1 ? `@${dpr}x` : '';

                // Generate AVIF (best compression)
                const avifPath = path.join(outputDir, `background-${size.suffix}${dprSuffix}.avif`);
                await sharp(inputPath)
                    .resize(actualWidth, actualHeight, {
                        fit: 'cover',
                        position: 'center',
                        withoutEnlargement: true
                    })
                    .avif({
                        quality: 75,
                        effort: 6,
                        chromaSubsampling: '4:2:0'
                    })
                    .toFile(avifPath);

                // Generate WebP (good compression)
                const webpPath = path.join(outputDir, `background-${size.suffix}${dprSuffix}.webp`);
                await sharp(inputPath)
                    .resize(actualWidth, actualHeight, {
                        fit: 'cover',
                        position: 'center',
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 80,
                        effort: 6
                    })
                    .toFile(webpPath);

                // Generate progressive JPEG fallback (better than PNG for photos)
                const jpegPath = path.join(outputDir, `background-${size.suffix}${dprSuffix}.jpg`);
                await sharp(inputPath)
                    .resize(actualWidth, actualHeight, {
                        fit: 'cover',
                        position: 'center',
                        withoutEnlargement: true
                    })
                    .jpeg({
                        quality: 85,
                        progressive: true,
                        mozjpeg: true
                    })
                    .toFile(jpegPath);

                if (dpr === 1) {
                    const avifStats = fs.statSync(avifPath);
                    const webpStats = fs.statSync(webpPath);
                    const jpegStats = fs.statSync(jpegPath);

                    console.log(`📱 ${size.suffix} (${size.width}x${size.height}):`);
                    console.log(`  AVIF: ${(avifStats.size / 1024).toFixed(1)} KB`);
                    console.log(`  WebP: ${(webpStats.size / 1024).toFixed(1)} KB`);
                    console.log(`  JPEG: ${(jpegStats.size / 1024).toFixed(1)} KB`);
                }
            }
        }

        // Generate blur placeholder (larger for better quality)
        const placeholderPath = path.join(outputDir, 'background-placeholder.webp');
        await sharp(inputPath)
            .resize(64, 64, {
                fit: 'cover',
                position: 'center'
            })
            .blur(2)
            .webp({
                quality: 20
            })
            .toFile(placeholderPath);

        const placeholderStats = fs.statSync(placeholderPath);
        console.log(`\n🔸 Blur placeholder (64x64): ${(placeholderStats.size / 1024).toFixed(1)} KB`);

        // Generate base64 inline placeholder
        const inlinePlaceholder = await sharp(inputPath)
            .resize(16, 16, {
                fit: 'cover',
                position: 'center'
            })
            .blur(1)
            .webp({
                quality: 10
            })
            .toBuffer();

        const base64 = inlinePlaceholder.toString('base64');
        console.log(`\n📦 Inline placeholder (16x16): ${base64.length} bytes`);
        console.log(`   Data URL: data:image/webp;base64,${base64.substring(0, 50)}...`);

        console.log('\n✅ Background images optimized successfully!');
        console.log('\n📋 Modern format cascade (best to worst):');
        console.log('  1. AVIF - Best compression (~30% smaller than WebP)');
        console.log('  2. WebP - Good compression, wide support');
        console.log('  3. Progressive JPEG - Universal fallback');
        console.log('\n🎨 All images generated with 1x and 2x (Retina) versions');

    } catch (error) {
        console.error('❌ Error optimizing background:', error);
        process.exit(1);
    }
}

// Run optimization if called directly
if (require.main === module) {
    optimizeBackground();
}

module.exports = { optimizeBackground };