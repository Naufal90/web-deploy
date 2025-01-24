const multer = require('multer');
const Jimp = require('jimp');
const jsonfile = require('jsonfile');
const fs = require('fs');
const path = require('path');

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

// Fungsi utama untuk mengonversi gambar ke struktur JSON
async function generateStructureFromImage(imagePath, outputPath) {
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
}

// Middleware untuk menangani file unggahan
const upload = multer({ dest: '/tmp/uploads/' });

async function handler(req, res) {
    if (req.method === 'POST') {
        const uploadMiddleware = upload.single('image');

        uploadMiddleware(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ error: 'Error saat mengupload file' });
            }

            const imagePath = req.file.path;
            const outputPath = `/tmp/${req.file.filename}.json`;

            try {
                await generateStructureFromImage(imagePath, outputPath);

                res.download(outputPath, `${req.file.filename}.json`, (err) => {
                    if (err) {
                        console.error('Error saat mengunduh file:', err);
                    }
                    fs.unlinkSync(imagePath); // Hapus file gambar setelah diproses
                    fs.unlinkSync(outputPath); // Hapus file JSON setelah diunduh
                });
            } catch (error) {
                console.error('❌ Terjadi kesalahan:', error.message);
                res.status(500).json({ error: 'Terjadi kesalahan saat memproses gambar' });
            }
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

module.exports = handler;
