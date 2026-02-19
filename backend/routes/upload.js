import express from 'express';
import { uploadCSV, getAnalysis } from '../controllers/uploadController.js';
import { upload } from '../middleware/multerConfig.js';

const router = express.Router();

// CSV Upload endpoint
router.post('/upload', upload.single('file'), uploadCSV);

// Get analysis by ID endpoint
router.get('/analysis/:id', getAnalysis);

export default router;
