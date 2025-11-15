# MrScrapper-AI-Integration-Manual-Integration

1. Dapatkan API key pada Deepseek.
2. Dalam scrapper.js dapat diganti untuk API key DeepSeek yang available dan memiliki Balance.

START SERVER

1. pada terminal masukkan "npm start"
2. Masukkan request yang ingin di scrap
   example:
   "http://localhost:${PORT}/api/scrape?query=nike&pages=1" untuk Nike
   "http://localhost:${PORT}/api/scrape?query=addidas&pages=1" untuk Addidas

RESPONSE AKAN tampil sebagai JSON FORMAT { "success": true, "query": "nike", "pages": "2", "total_products": 15, "products": [ { "name": "Nike Air Force 1 '07 White", "price": "$120.00", "description": "Brand new Nike Air Force 1 sneakers in white color...", "url": "https://www.ebay.com/itm/123456789", "extracted_by": "ai", "ai_error": null }, { "name": "Nike Jordan 1 Retro", "price": "$250.00", "description": "-", "url": "https://www.ebay.com/itm/987654321", "extracted_by": "manual", "ai_error": "AI API Error: 401 - Invalid API key" } ] }

