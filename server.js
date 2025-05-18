const express = require('express');
const fs = require('fs');
const path = require('path');
require('./public/obsclient').connectOBS();

const { cropLastImageWithProbability } = require('./public/shapecropping');

const app = express();
const IMAGE_DIR = path.join(__dirname, 'public', 'images');
const STOCK_DIR = path.join(__dirname, 'public', 'stockimages');

app.use(express.static('public'));

app.get('/images', (req, res) => {
    fs.readdir(IMAGE_DIR, (err, files) => {
        if (err) {
            res.status(500).send('Error reading image folder');
            return;
        }
        const images = files.filter(file =>
            ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase())
        );
        res.json(images);
    });
});

// Feed a random stock image into the images folder every 10 seconds
setInterval(() => {
    fs.readdir(STOCK_DIR, (err, files) => {
        if (err || files.length === 0) return;
        const stockImages = files.filter(file =>
            /\.(jpe?g|png|gif)$/i.test(file)
        );
        if (stockImages.length === 0) return;
        const randomFile = stockImages[Math.floor(Math.random() * stockImages.length)];
        const srcPath = path.join(STOCK_DIR, randomFile);
        const destName = `stock_${Date.now()}_${randomFile}`;
        const destPath = path.join(IMAGE_DIR, destName);
        fs.copyFile(srcPath, destPath, err => {
            if (!err) console.log(`Fed stock image: ${destName}`);
        });
    });
}, 10000); // 10 seconds

// Live cropping service: try to crop the last image every 10 seconds with 50% probability
setInterval(() => {
    cropLastImageWithProbability({ probability: 0.5 })
        .then(() => {
            console.log('Auto-cropping attempt (50% probability).');
            // Clean up the image folder if there are 50 or more images
            fs.readdir(IMAGE_DIR, (err, files) => {
                if (err) return;
                const images = files.filter(file =>
                    /\.(jpe?g|png|gif)$/i.test(file)
                );
                if (images.length >= 50) {
                    images.forEach(file => {
                        fs.unlink(path.join(IMAGE_DIR, file), err => {
                            if (!err) console.log(`Deleted image: ${file}`);
                        });
                    });
                }
            });
        })
        .catch(err => console.error('Cropping failed:', err));
}, 10000); // 10 seconds

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});