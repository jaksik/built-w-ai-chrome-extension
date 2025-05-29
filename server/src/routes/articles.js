const express = require('express');
const router = express.Router();
const Article = require('../models/article');

// GET all articles
router.get('/', async (req, res) => {
  try {
    const articles = await Article.find().sort({ fetchedAt: -1 });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new article
router.post('/', async (req, res) => {
  console.log('Received article data:', req.body); // Debug log
  
  const article = new Article({
    title: req.body.title,
    link: req.body.link,
    sourceName: req.body.sourceName,
    descriptionSnippet: req.body.descriptionSnippet,
    publishedDate: req.body.publishedDate
  });

  try {
    const newArticle = await article.save();
    console.log('Article saved successfully:', newArticle._id); // Debug log
    res.status(201).json(newArticle);
  } catch (err) {
    console.error('Error saving article:', err.message); // Debug log
    
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return res.status(409).json({ 
        message: 'Article with this link already exists',
        error: 'DUPLICATE_ARTICLE'
      });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: `Validation failed: ${validationErrors.join(', ')}`,
        error: 'VALIDATION_ERROR'
      });
    }
    
    // Generic error
    res.status(400).json({ 
      message: err.message,
      error: 'SAVE_ERROR'
    });
  }
});

// DELETE article
router.delete('/:id', async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'Article deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
