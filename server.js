const express = require('express');
const multer = require('multer');
const Jimp = require('jimp');
const jsonfile = require('jsonfile');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');

// Konfigurasi penyimpanan file sementara untuk upload gambar
const upload = multer({ dest: 'uploads/' });

// Peta warna ke jenis blok Minecraft
const COLOR_TO_BLOCK = {
    '#000000': 'black_concrete',
    '#ffffff': 'white_concrete',
    '#ff0000': 'red_concrete',
    '#00ff00': 'green_concrete',
    '#0000ff': 'blue_concrete',
    '#ffff00': 'yellow_concrete',
    '#ff00ff': 'magenta_concrete',
    '#00ffff': 'cyan_concrete',
    '#808080': 'stone',
};

// Fungsi untuk mendapatkan warna terdekat
function getClosestBlock(colorHex) {
    const colors = Object.keys(COLOR_TO_BLOCK);
    let closest = colors[0];
    let minDiff = Infinity;

    colors.forEach(refColor => {
        const diff = colorDifference(colorHex, refColor);
        if (diff < minDiff) {
            closest = refColor;
            minDiff = diff;
        }
    });

    return COLOR_TO_BLOCK[closest];
}

// Fungsi untuk menghitung perbedaan warna
function colorDifference(color1, color2) {
    const c1 = Jimp.intToRGBA(Jimp.cssColorToHex(color1));
    const c2 = Jimp.intToRGBA(Jimp.cssColorToHex(color2));
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

// Fungsi untuk mengonversi gambar ke struktur JSON
async function generateStructureFromImage(imagePath, outputPath) {
    try {
        const image = await Jimp.read(imagePath);
        const blocks = [];
        const origin = { x: 0, y: 0, z: 0 };

        image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
            const r = image.bitmap.data[idx];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];
            const hexColor = Jimp.rgbaToInt(r, g, b, 255).toString(16).padStart(6, '0');
            const colorHex = `#${hexColor}`;

            const blockType = getClosestBlock(colorHex);
            if (blockType) {
                blocks.push({ x, y: -y, z: 0, type: blockType });
            }
        });

        const structure = { origin, blocks };
        jsonfile.writeFileSync(outputPath, structure, { spaces: 2 });
        console.log(chalk.green(`✅ Struktur berhasil disimpan ke ${outputPath}`));
    } catch (err) {
        console.error(chalk.red('❌ Terjadi kesalahan:'), err.message);
    }
}

// Inisialisasi Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware untuk menerima data form
app.use(express.static(__dirname)); // Untuk file statis seperti HTML
app.use(express.urlencoded({ extended: true }));

// Menampilkan form upload gambar
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint untuk meng-handle upload gambar dan menghasilkan JSON
app.post('/generate', upload.single('image'), async (req, res) => {
    const imagePath = req.file.path;
    const outputPath = `output/${req.file.filename}.json`;
    
    // Pastikan folder output ada
    if (!fs.existsSync('output')) {
        fs.mkdirSync('output');
    }

    await generateStructureFromImage(imagePath, outputPath);

    res.download(outputPath, `${req.file.filename}.json`, (err) => {
        if (err) {
            console.error('Error saat mengunduh file:', err);
        }
        fs.unlinkSync(imagePath); // Hapus file gambar setelah diproses
        fs.unlinkSync(outputPath); // Hapus file JSON setelah diunduh
    });
});

// Mulai server
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
