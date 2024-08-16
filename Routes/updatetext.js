const express = require('express');
const { getupdatetext } = require('../utils/audio');
const router = express.Router();

router.post('/extract-text', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      console.log('No text provided in request body');
      return res.status(400).json({ message: 'Text is required' });
    }

    console.log('Processing text:', text);

    const updatedField = await getupdatetext(text);

    if (!updatedField) {
      console.log('Failed to update text for:', text);
      return res.status(500).json({ message: 'Failed to update text' });
    }

    console.log('Successfully updated text:', updatedField);
    res.status(200).json({ updatedField });

  } catch (error) {
    console.error('Error during text processing:', error);
    res.status(500).json({ message: 'Internal Server Error', details: error.message });
  }
});

module.exports = router;
