import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    // 💡 Usar file.fieldname en lugar de 'producto' hardcodeado
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen.'), false);
  }
};

export const upload = multer({ storage, fileFilter });

const documentoFilter = (req, file, cb) => {
  const esImagen = file.mimetype.startsWith('image/');
  const esPdf = file.mimetype === 'application/pdf';

  if (esImagen || esPdf) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes o archivos PDF.'), false);
  }
};

export const uploadDocumentos = multer({ storage, fileFilter: documentoFilter });