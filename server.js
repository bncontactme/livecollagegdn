// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const IMAGE_DIR = path.join(__dirname, 'public', 'images');

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
