const Jimp = require('jimp');
const jsonfile = require('jsonfile');
const readlineSync = require('readline-sync');
const chalk = require('chalk');

// Peta warna ke jenis blok Minecraft
const COLOR_TO_BLOCK = {
    '#000000': 'black_concrete', // Hitam
    '#ffffff': 'white_concrete', // Putih
    '#ff0000': 'red_concrete',   // Merah
    '#00ff00': 'green_concrete', // Hijau
    '#0000ff': 'blue_concrete',  // Biru
    '#ffff00': 'yellow_concrete', // Kuning
    '#ff00ff': 'magenta_concrete', // Magenta
    '#00ffff': 'cyan_concrete',   // Cyan
    '#808080': 'stone',          // Abu-abu
    // Tambahkan lebih banyak warna sesuai kebutuhan
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
    try {
        const image = await Jimp.read(imagePath);
        const blocks = [];
        const origin = { x: 0, y: 0, z: 0 };

        // Membaca piksel gambar
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

        // Menyimpan ke file JSON
        const structure = { origin, blocks };
        jsonfile.writeFileSync(outputPath, structure, { spaces: 2 });
        console.log(chalk.green(`✅ Struktur berhasil disimpan ke ${outputPath}`));
    } catch (err) {
        console.error(chalk.red('❌ Terjadi kesalahan:'), err.message);
    }
}

// Interaksi dengan pengguna
const imagePath = readlineSync.question('Masukkan path gambar (contoh: ./image.png): ');
const outputPath = readlineSync.question('Masukkan path output JSON (contoh: ./building.json): ');

generateStructureFromImage(imagePath, outputPath);