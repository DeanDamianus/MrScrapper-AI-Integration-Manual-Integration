const express = require('express');
const EBayScraper = require('./scraper');

const app = express();
const PORT = 3001;

app.use(express.json());
const scraper = new EBayScraper();

app.get('/api/scrape', async (req, res) => {
    try {
        const { query = 'nike', pages = 2 } = req.query;
        
        console.log(`Scraping ${pages} pages for: ${query}`);
        const products = await scraper.scrapeProducts(query, parseInt(pages));

        res.json({
            success: true,
            query: query,
            pages: pages,
            total_products: products.length,
            products: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Test: http://localhost:${PORT}/api/scrape?query=nike&pages=1`);
});