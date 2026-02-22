import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { protect } from '../middleware/auth.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to intercept raw files natively into memory buffering
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Keep uploads under 5MB to avoid overwhelming memory
    }
});

/**
 * @desc    Upload an image natively to Cloudinary using RAM buffer streams
 * @route   POST /api/upload
 * @access  Private
 */
router.post('/', protect, upload.single('image'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        // Stream the raw buffer chunk from Node.js RAM directly into Cloudinary CDN
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'connect_app',
                resource_type: 'auto', // Detects images, docs, videos intelligently
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
