export default function handler(req, res) {
  console.log('Health check called');
  
  try {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      error: 'Health check failed',
      message: error.message 
    });
  }
}
