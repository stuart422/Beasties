// Turns an uploaded file into two clean JPEGs: a large copy (1800px wide at most) and a
// small thumbnail. Re-encoding drops all metadata, so GPS and other EXIF data never survive.
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import exifReader from 'exif-reader';

export const MAX_FILE_BYTES = 30 * 1024 * 1024;
export const MAX_FILES = 20;
export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Identify the real file type from its first bytes, not from the name the browser sent.
export function sniffType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buf.toString('ascii', 8, 12);
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'heic';
  }
  return null;
}

// The weekday the camera recorded, if the file says. Read before metadata is stripped.
async function takenWeekday(buf) {
  try {
    const { exif } = await sharp(buf).metadata();
    if (!exif) return null;
    const tags = exifReader(exif);
    const when = tags?.Photo?.DateTimeOriginal || tags?.Image?.DateTime;
    return when instanceof Date && !Number.isNaN(when.getTime()) ? WEEKDAYS[when.getUTCDay()] : null;
  } catch {
    return null;
  }
}

export async function processImage(buf) {
  const type = sniffType(buf);
  if (!type) throw new Error('Only JPG, PNG, WEBP and HEIC photos can be added.');
  let input = buf;
  const originalWeekday = await takenWeekday(buf); // HEIC conversion drops the date, so read it first
  if (type === 'heic') {
    try {
      input = Buffer.from(await heicConvert({ buffer: buf, format: 'JPEG', quality: 0.92 }));
    } catch {
      throw new Error('This HEIC photo could not be read.');
    }
  }
  const weekday = originalWeekday || (await takenWeekday(input));
  // rotate() applies the camera orientation; output carries no metadata at all.
  const large = await sharp(input).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const small = await sharp(large.data).resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  return { large: large.data, small, width: large.info.width, height: large.info.height, weekday };
}
