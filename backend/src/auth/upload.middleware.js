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
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Filtro unificado que permite imágenes y archivos PDF
const documentoFilter = (req, file, cb) => {
  const esImagen = file.mimetype.startsWith('image/');
  const esPdf = file.mimetype === 'application/pdf';

  if (esImagen || esPdf) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen y PDF.'), false);
  }
};

// Exportación de multers configurados con el filtro correspondiente
export const upload = multer({ storage, fileFilter: documentoFilter });
export const uploadDocumentos = multer({ storage, fileFilter: documentoFilter });