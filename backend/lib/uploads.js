'use strict';
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
let sharp = null;
try { sharp = require('sharp'); }
catch (e) { console.warn('[Uploads] sharp not installed — images will not be optimized'); }

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'
]);

// Store first in memory so we can pipe through sharp
const memStorage = multer.memoryStorage();

const upload = multer({
  storage: memStorage,
  limits: { fileSize: 50 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error(`Desteklenmeyen dosya türü: ${file.mimetype}`));
    }
    cb(null, true);
  }
});

function fileType(mime) {
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  return 'file';
}

// Process uploaded buffer — optimize images via sharp, save to disk
async function processUpload(file) {
  const hash = crypto.randomBytes(8).toString('hex');
  const isImage = file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml' && file.mimetype !== 'image/gif';

  if (isImage && sharp) {
    try {
      // Convert to optimized WebP (smaller, fast)
      const filename = `${Date.now()}_${hash}.webp`;
      const filePath = path.join(UPLOAD_DIR, filename);
      const meta = await sharp(file.buffer).metadata();
      // Auto-resize if larger than 2000px width
      let pipeline = sharp(file.buffer).rotate(); // respect EXIF
      if ((meta.width || 0) > 2000) pipeline = pipeline.resize({ width: 2000, withoutEnlargement: true });
      await pipeline.webp({ quality: 85 }).toFile(filePath);
      const stats = fs.statSync(filePath);
      return {
        type: 'photo',
        url: `/uploads/${filename}`,
        name: file.originalname,
        size: stats.size,
        mime: 'image/webp',
        original_size: file.size,
        optimized: true
      };
    } catch (e) {
      console.warn('[Sharp] processing failed, saving raw:', e.message);
    }
  }

  // Fallback: save raw file
  const ext = path.extname(file.originalname).toLowerCase().replace(/[^.\w]/g, '').slice(0, 10) || mimeExt(file.mimetype);
  const filename = `${Date.now()}_${hash}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filePath, file.buffer);
  return {
    type: fileType(file.mimetype),
    url: `/uploads/${filename}`,
    name: file.originalname,
    size: file.size,
    mime: file.mimetype
  };
}

function mimeExt(mime) {
  const m = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
              'image/webp': '.webp', 'image/svg+xml': '.svg',
              'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
  return m[mime] || '';
}

function deleteUploadedFile(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const filename = path.basename(url);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch {}
  }
}

module.exports = { upload, processUpload, UPLOAD_DIR, fileType, deleteUploadedFile };
