const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const imagesDir = path.join(__dirname, 'images');

function cropStar(ctx, w, h, spikes = 5) {
    const outerRadius = Math.min(w, h) / 2;
    const innerRadius = outerRadius / 2.5;
    const cx = w / 2, cy = h / 2;
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(
            cx + Math.cos(rot) * outerRadius,
            cy + Math.sin(rot) * outerRadius
        );
        rot += step;
        ctx.lineTo(
            cx + Math.cos(rot) * innerRadius,
            cy + Math.sin(rot) * innerRadius
        );
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.clip();
}

async function cropLastImageWithProbability(options = {}) {
    const probability = typeof options.probability === 'number' ? options.probability : 0.5;

    const files = fs.readdirSync(imagesDir)
        .filter(f => /\.(jpe?g|png)$/i.test(f) && !f.includes('_cropped'))
        .sort((a, b) => fs.statSync(path.join(imagesDir, b)).mtimeMs - fs.statSync(path.join(imagesDir, a)).mtimeMs);

    if (files.length === 0) {
        console.log('No uncropped images found.');
        return;
    }

    if (Math.random() > probability) {
        console.log('Skipping cropping this time (probability check).');
        return;
    }

    const file = files[0];
    const imgPath = path.join(imagesDir, file);
    const img = await loadImage(imgPath);
    const size = Math.min(img.width, img.height);
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    cropStar(ctx, size, size, 5);
    ctx.drawImage(img, (size - img.width) / 2, (size - img.height) / 2);

    const ext = path.extname(file);
    const base = path.basename(file, ext);
    const outPath = path.join(imagesDir, `${base}_cropped${ext}`);
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`Cropped ${file} as star -> ${base}_cropped${ext}`);

    fs.unlinkSync(imgPath);
    console.log(`Removed original image: ${file}`);
}

module.exports = { cropLastImageWithProbability };