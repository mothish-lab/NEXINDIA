/**
 * Cloudinary Service — Image upload and management.
 */

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer - Image buffer
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
function uploadImageBuffer(buffer, folder = 'civic-issues') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        max_bytes: 5 * 1024 * 1024, // 5MB limit
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ secure_url: result.secure_url, public_id: result.public_id });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

/**
 * Delete an image from Cloudinary by public_id.
 * @param {string} publicId
 */
async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
}

module.exports = { uploadImageBuffer, deleteImage };
