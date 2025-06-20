require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Twilio client for WhatsApp
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Custom URL shortener function with dynamic base URL
function shortenUrl() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let shortCode = '';
  for (let i = 0; i < 6; i++) {
    shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${process.env.BASE_URL || 'http://localhost:5000'}/s/${shortCode}`;
}

// Initial price check on server start
async function initialPriceCheck() {
  console.log('Performing initial price check on server start...');
  try {
    const products = await pool.query('SELECT * FROM products');
    for (const product of products.rows) {
      const productInfo = await scrapeProductInfo(product.url);
      const newPrice = productInfo.price;

      if (newPrice !== product.current_price) {
        await pool.query(
          'UPDATE products SET current_price = $1, original_price = $2 WHERE id = $3',
          [newPrice, product.original_price || newPrice, product.id]
        );

        if (newPrice <= product.target_price) {
          await sendNotifications(product, newPrice);
          await pool.query(
            'UPDATE products SET notified = true WHERE id = $1',
            [product.id]
          );
        } else {
          await pool.query(
            'UPDATE products SET notified = false WHERE id = $1',
            [product.id]
          );
        }
      }
    }
  } catch (error) {
    console.error('Error in initial price check:', error);
  }
}

// API endpoints
app.post('/api/track-product', async (req, res) => {
  const { url, targetPrice, email, phone } = req.body;
  const productId = uuidv4();
  const shortUrl = shortenUrl();

  try {
    const productInfo = await scrapeProductInfo(url);

    await pool.query(
      'INSERT INTO products (id, url, short_url, name, image, website, current_price, target_price, email, phone, notified, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())',
      [productId, url, shortUrl, productInfo.name, productInfo.image, productInfo.website, productInfo.price, targetPrice, email, phone, false]
    );

    res.status(201).json({
      message: 'Product tracking started successfully',
      product: {
        id: productId,
        url,
        short_url: shortUrl,
        ...productInfo,
        targetPrice
      }
    });
  } catch (error) {
    console.error('Error tracking product:', error);
    res.status(500).json({ error: 'Failed to track product' });
  }
});

// New endpoint to redirect short URLs
app.get('/s/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  try {
    const result = await pool.query('SELECT url FROM products WHERE short_url LIKE $1', [`${process.env.BASE_URL || 'http://localhost:5000'}/s/${shortCode}%`]);
    if (result.rows.length > 0) {
      res.redirect(result.rows[0].url);
    } else {
      res.status(404).send('Short URL not found');
    }
  } catch (error) {
    console.error('Error redirecting short URL:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const productsResult = await pool.query('SELECT COUNT(*) FROM products');
    const savingsResult = await pool.query(
      'SELECT COALESCE(SUM(target_price - current_price), 0) FROM products WHERE current_price <= target_price'
    );
    const nearTargetResult = await pool.query(
      'SELECT COUNT(*) FROM products WHERE current_price <= target_price * 1.1 AND current_price > target_price'
    );
    const avgDiscountResult = await pool.query(
      'SELECT COALESCE(AVG((original_price - current_price) / original_price * 100), 0) FROM products WHERE original_price > 0'
    );

    res.json({
      totalProducts: parseInt(productsResult.rows[0].count),
      potentialSavings: parseFloat(savingsResult.rows[0].sum || 0),
      nearTarget: parseInt(nearTargetResult.rows[0].count),
      avgDiscount: parseFloat(avgDiscountResult.rows[0].avg || 0).toFixed(2)
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.put('/api/product/:id', async (req, res) => {
  const { id } = req.params;
  const { targetPrice } = req.body;

  try {
    await pool.query(
      'UPDATE products SET target_price = $1 WHERE id = $2',
      [targetPrice, id]
    );
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/product/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// New endpoint for similar products
app.post('/api/similar-products', async (req, res) => {
  const { url } = req.body;

  try {
    const similarProducts = await fetchSimilarProducts(url);
    res.json(similarProducts);
  } catch (error) {
    console.error('Error fetching similar products:', error);
    res.status(500).json({ error: 'Failed to fetch similar products' });
  }
});

// Price check scheduler (runs every minute for testing, change to '0 * * * *' for hourly)
cron.schedule('* * * * *', async () => {
  console.log('Running price check...');
  try {
    const products = await pool.query('SELECT * FROM products');

    for (const product of products.rows) {
      const productInfo = await scrapeProductInfo(product.url);
      const newPrice = productInfo.price;

      if (newPrice !== product.current_price) {
        await pool.query(
          'UPDATE products SET current_price = $1, original_price = $2 WHERE id = $3',
          [newPrice, product.original_price || newPrice, product.id]
        );
      }

      // Always check and update notified status based on current price
      if (newPrice <= product.target_price) {
        if (!product.notified) {
          await sendNotifications(product, newPrice);
          await pool.query(
            'UPDATE products SET notified = true WHERE id = $1',
            [product.id]
          );
        }
      } else {
        await pool.query(
          'UPDATE products SET notified = false WHERE id = $1',
          [product.id]
        );
      }
    }
  } catch (error) {
    console.error('Error in price check scheduler:', error);
  }
});

async function scrapeProductInfo(url) {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': 'https://www.amazon.com/'
        },
        timeout: 10000
      });
      const $ = cheerio.load(response.data);

      if (url.includes('amazon.com') || url.includes('amazon.in')) {
        const name = $('#productTitle').text().trim() || $('h1').first().text().trim() || 'Product';
        const image = $('#imgTagWrapperId img').attr('src') || $('#landingImage').attr('src') || $('img#main-image').attr('src') || '';
        const price = parseFloat($('.priceToPay span').first().text().replace(/[^0-9.]/g, '') || $('.a-offscreen').first().text().replace(/[^0-9.]/g, '') || 0);
        return { name, image: image.startsWith('http') ? image : `https${image.substring(image.indexOf(':'))}`, price, website: 'Amazon' };
      } else if (url.includes('flipkart.com')) {
        const name = $('._2cLu-l').text().trim() || $('span.B_NuCI').text().trim();
        const image = $('._3gnMPk img').attr('src') || '';
        const price = parseFloat($('._25b18c').text().replace(/[^0-9.]/g, '') || 0);
        return { name, image, price, website: 'Flipkart' };
      } else if (url.includes('meesho.com')) {
        const name = $('h1').first().text().trim();
        const image = $('.image-container img').attr('src') || '';
        const price = parseFloat($('.price').text().replace(/[^0-9.]/g, '') || 0);
        return { name, image, price, website: 'Meesho' };
      } else if (url.includes('westside.com')) {
        const name = $('h1.product-name').text().trim();
        const image = $('.product-image img').attr('src') || '';
        const price = parseFloat($('.product-price').text().replace(/[^0-9.]/g, '') || 0);
        return { name, image, price, website: 'Westside' };
      } else if (url.includes('hm.com')) {
        const name = $('h1.product-name').text().trim();
        const image = $('.product-image img').attr('src') || '';
        const price = parseFloat($('.price').text().replace(/[^0-9.]/g, '') || 0);
        return { name, image, price, website: 'H&M' };
      }
      return {
        name: $('h1').first().text().trim() || 'Product',
        image: $('img').first().attr('src') || '',
        price: 0,
        website: new URL(url).hostname
      };
    } catch (error) {
      console.error(`Attempt ${attempt} failed for ${url}:`, error.message);
      if (attempt === maxRetries) {
        console.warn(`Max retries reached for ${url}. Using fallback data.`);
        return {
          name: 'Product',
          image: '',
          price: 0,
          website: new URL(url).hostname
        };
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
    }
  }
}

async function fetchSimilarProducts(url) {
  if (!url || typeof url !== 'string') {
    console.error('Invalid or empty URL provided for similar products');
    return [];
  }

  try {
    new URL(url);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    const similar = [];

    if (url.includes('amazon.com') || url.includes('amazon.in')) {
      $('.s-result-item').each((i, el) => {
        const name = $(el).find('h2 a span').text().trim();
        const image = $(el).find('img.s-image').attr('src') || '';
        const price = parseFloat($(el).find('.a-price span').text().replace(/[^0-9.]/g, '') || 0);
        if (name && image && price) similar.push({ name, image, price, website: 'Amazon' });
      });
    } else if (url.includes('flipkart.com')) {
      $('.bhgxx2').each((i, el) => {
        const name = $(el).find('._2cLu-l').text().trim();
        const image = $(el).find('img._3togXc').attr('src') || '';
        const price = parseFloat($(el).find('._25b18c').text().replace(/[^0-9.]/g, '') || 0);
        if (name && image && price) similar.push({ name, image, price, website: 'Flipkart' });
      });
    }

    return similar.slice(0, 3);
  } catch (error) {
    console.error('Error fetching similar products:', error.message);
    return [];
  }
}

async function sendNotifications(product, newPrice) {
  if (product.email) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: product.email,
      subject: 'Price Drop Alert!',
      text: `The price for ${product.name} has dropped to $${newPrice}, which matches or is below your target of $${product.target_price}!\n\nOriginal URL: ${product.url}`
    };
    await transporter.sendMail(mailOptions);
    console.log(`Email notification sent to ${product.email}`);
  }
  if (product.phone) {
    try {
      // Ensure phone number is in international format (e.g., +918106541447)
      const formattedPhone = `+${product.phone.replace(/[^0-9]/g, '')}`;
      await twilioClient.messages.create({
        body: `Price Drop Alert! ${product.name} is now $${newPrice} (your target: $${product.target_price}). Check it out: ${product.url}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${formattedPhone}`
      });
      console.log(`WhatsApp notification sent to ${formattedPhone}`);
    } catch (error) {
      if (error.status === 429 && error.code === 63038) {
        console.log('WhatsApp notification failed: Twilio daily limit exceeded. Skipping WhatsApp notification.');
      } else if (error.code === 21610) {
        console.log('WhatsApp notification failed: Invalid phone number format or unverified number.');
      } else {
        console.error('WhatsApp notification failed:', error);
      }
    }
  }
}

const PORT = process.env.PORT || 5000;

// Run initial price check when server starts
initialPriceCheck().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
