const puppeteer = require('puppeteer');
const axios = require('axios');

class EBayScraper {
    constructor() {
        this.baseURL = 'https://www.ebay.com';
        this.aiAPI = 'https://api.deepseek.com/v1/chat/completions';
        this.apiKey = 'sk-42bc932ecd7f4def960714c2eccfef8a';
    }

    async scrapeProducts(searchQuery = 'nike', maxPages = 2) {
        const browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const allProducts = [];
            
            for (let page = 1; page <= maxPages; page++) {
                console.log(`Scraping page ${page}...`);
                const products = await this.scrapePage(browser, searchQuery, page);
                if (products.length === 0) break;
                allProducts.push(...products);
                await this.delay(2000);
            }
            
            console.log(`Total products found: ${allProducts.length}`);
            return allProducts;
            
        } finally {
            await browser.close();
        }
    }
    async scrapePage(browser, searchQuery, pageNum) {
        const page = await browser.newPage();
        
        try {
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            const url = `${this.baseURL}/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&_pgn=${pageNum}`;
            console.log(`Going to: ${url}`);

            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            await this.delay(3000); 
            const productLinks = await page.evaluate(() => {
                const links = [];
                const allLinks = document.querySelectorAll('a[href*="/itm/"]');

                allLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && !href.includes('google') && !href.includes('clk')) {
                        links.push(href);
                    }
                });

                return [...new Set(links)].slice(0, 10);
            }); 
            console.log(`Found ${productLinks.length} product links`);

            const products = [];
                for (const link of productLinks) {
                    try {
                        const product = await this.scrapeProductDetail(browser, link);
                        products.push(product);
                        await this.delay(1000);
                    } catch (error) {
                        console.log(`Failed to scrape: ${error.message}`);
                        products.push({ 
                            name: '-', 
                            price: '-', 
                            description: '-', 
                            url: link 
                        });
                    }
                }

            return products;

            } catch (error) {
                console.log(`Page error:`, error.message);
                return [];
            } finally {
                await page.close();
        }
    } 
    async scrapeProductDetail(browser, productUrl) {
        const page = await browser.newPage();
        
        try {
            const fullUrl = productUrl.startsWith('http') ? productUrl : `https://www.ebay.com${productUrl}`;
            console.log(`Opening product: ${fullUrl}`);

            await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.delay(2000);
            const pageContent = await page.evaluate(() => {
                return document.body.innerText.substring(0, 2000);
            });
            let productInfo;
            let aiError = null;

            try {
                console.log('Trying AI extraction...');
                productInfo = await this.extractWithAI(pageContent);
                console.log('AI extraction successful');
            } catch (error) {
                aiError = error.message;
                console.log(`AI failed: ${error.message}, using manual extraction`);
                productInfo = await this.manualExtraction(page);
            }
            return {
                name: productInfo.name,
                price: productInfo.price,
                description: productInfo.description,
                url: fullUrl,
                extracted_by: aiError ? 'manual' : 'ai',
                ai_error: aiError || null
            };

        } catch (error) {
            console.log(`Product detail error: ${error.message}`);
            throw error;
        } finally {
            await page.close();
    }
    }  
    async extractWithAI(pageContent) {
        const prompt = `
        Extract product information from this eBay product page. Return ONLY JSON with these exact fields:
        - name: product name/title (string)
        - price: product price with currency (string) 
        - description: product description (string)
        
        Rules:
        1. If any field is not found, use "-"
        2. Clean the text - remove extra spaces
        
        Page Content:
        ${pageContent}
        
        Return ONLY JSON, no other text.
        `;

        try {
            const response = await axios.post(this.aiAPI, {
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 500
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                timeout: 10000
            });

            if (response.status !== 200) {
                throw new Error(`AI API returned status ${response.status}`);
            }

            const content = response.data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            
            if (!jsonMatch) {
                throw new Error('AI returned invalid JSON format');
            }
            
            const productInfo = JSON.parse(jsonMatch[0]);

            return {
                name: productInfo.name || '-',
                price: productInfo.price || '-',
                description: productInfo.description || '-'
            };

        } catch (error) {
            if (error.response) {
                throw new Error(`AI API Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
            } else if (error.request) {
                throw new Error('AI API Network Error - No response received');
            } else {
                throw new Error(`AI Extraction Error: ${error.message}`);
            }
        }
    }
    async manualExtraction(page) {
        const productInfo = await page.evaluate(() => {
            const getText = (selectors) => {
                if (!Array.isArray(selectors)) selectors = [selectors];
                
                for (const selector of selectors) {
                    const el = document.querySelector(selector);
                    if (el && el.textContent && el.textContent.trim()) {
                        return el.textContent.trim();
                    }
                }
                return '-';
            };

            return {
                name: getText(['h1.x-item-title__mainTitle', 'h1', '.product-title']),
                price: getText(['.x-price-primary', '.x-price-approx', '.display-price']),
                description: getText(['.d-item-detail-elements', '.item-desc', '#desc_wrapper'])
            };
        });

        return productInfo;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
module.exports = EBayScraper;