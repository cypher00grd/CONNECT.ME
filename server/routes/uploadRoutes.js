import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { fileTypeFromBuffer } from 'file-type';
import { protect } from '../middleware/auth.js';
import { uploadRateLimiter } from '../middleware/security.js';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to intercept raw files natively into memory buffering
const storage = multer.memoryStorage();
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Keep uploads under 5MB to avoid overwhelming memory
        files: 1,
        fields: 2,
        parts: 3,
    },
    fileFilter: (req, file, cb) => {
        if (!allowedImageTypes.has(file.mimetype)) {
            const error = new Error('Only JPEG, PNG, and WebP images are allowed');
            error.statusCode = 400;
            return cb(error);
        }
        cb(null, true);
    }
});

/**
 * @desc    Upload an image natively to Cloudinary using RAM buffer streams
 * @route   POST /api/upload
 * @access  Private
 */
router.post('/', protect, uploadRateLimiter, upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        const detectedType = await fileTypeFromBuffer(req.file.buffer);
        if (!detectedType || !allowedImageTypes.has(detectedType.mime)) {
            return res.status(400).json({
                success: false,
                message: 'Only valid JPEG, PNG, and WebP images are allowed'
            });
        }

        // Stream the raw buffer chunk from Node.js RAM directly into Cloudinary CDN
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'connect_app',
                resource_type: 'image',
                allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                transformation: [
                    { quality: 'auto:good', fetch_format: 'auto' }
                ],
                context: {
                    uploaded_by: req.user._id.toString()
                }
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload failed:", error);
                    return res.status(500).json({ success: false, message: 'Cloud migration failed' });
                }

                // Return the secure URL back to React
                res.status(200).json({
                    success: true,
                    url: result.secure_url,
                    format: result.format,
                    public_id: result.public_id,
                });
            }
        );

        // Blast the buffer out of memory into the remote Cloudinary stream
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

    } catch (error) {
        console.error("Upload error:", error);
        next(error);
    }
});

export default router;
