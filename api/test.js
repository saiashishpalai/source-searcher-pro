export default function handler(req, res) {
  console.log('Test API called');
  
  try {
    // Test basic functionality
    res.status(200).json({ 
      message: 'Test API working',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({ 
      error: 'Test API failed',
      message: error.message 
    });
  }
}
