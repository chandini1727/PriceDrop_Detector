import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './TrackProduct.css';

const TrackProduct = () => {
  const [url, setUrl] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [productInfo, setProductInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [similarProducts, setSimilarProducts] = useState([]);
  const [submittedUrl, setSubmittedUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSimilarProducts([]);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/track-product`, {
        url,
        targetPrice: parseFloat(targetPrice),
        email,
        phone,
      });

      setProductInfo(response.data.product);
      setSubmittedUrl(url);
      setUrl('');
      setTargetPrice('');
      setEmail('');
      setPhone('');
      setSimilarProducts(await fetchSimilarProducts(url));
    } catch (err) {
      setError('Failed to track product. Please check the URL and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (productInfo && submittedUrl) {
      fetchSimilarProducts(submittedUrl).then(setSimilarProducts);
    }
  }, [productInfo, submittedUrl]);

  async function fetchSimilarProducts(productUrl) {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/similar-products`, { url: productUrl });
      return response.data;
    } catch (error) {
      console.error('Error fetching similar products:', error);
      return [];
    }
  }

  return (
    <div className="track-product">
      <div className="hero">
        <h1>Smart Price Drop Detection</h1>
      </div>

      <div className="features">
        <div className="feature">
          <h3>Smart Tracking</h3>
          <p>Advanced algorithms monitor prices across multiple websites</p>
        </div>
        <div className="feature">
          <h3>Instant Alerts</h3>
          <p>Get notified via WhatsApp and email when prices drop</p>
        </div>
        <div className="feature">
          <h3>Save Money</h3>
          <p>Automatically find the best deals and save on every purchase</p>
        </div>
      </div>

      <div className="track-form">
        <h2>Add Product to Track</h2>
        <p>Paste any product URL from Amazon, Flipkart, Meesho, Westside, H&M, or other supported sites</p>

        <form onSubmit={handleSubmit}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://amazon.com/product-url"
            required
          />

          <div className="form-group">
            <label>Target Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email for Notifications (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>Phone for WhatsApp Alerts (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Tracking...' : 'Track This Product'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {productInfo && (
          <div className="product-preview">
            <h3>Now Tracking:</h3>
            <div className="product-card">
              <img src={productInfo.image} alt={productInfo.name} />
              <div>
                <h4><Link to={`/product/${productInfo.id}`}>{productInfo.name}</Link></h4>
                <p>Website: {productInfo.website}</p>
                <p>Current Price: ${productInfo.current_price}</p>
                <p>Target Price: ${productInfo.targetPrice}</p>
              </div>
            </div>
          </div>
        )}

        {similarProducts.length > 0 && (
          <div className="similar-products">
            <h3>Similar Products</h3>
            <div className="product-list">
              {similarProducts.map((prod, index) => (
                <div key={index} className="product-item">
                  <img src={prod.image} alt={prod.name} />
                  <div className="product-details">
                    <h4>{prod.name}</h4>
                    <p>Website: {prod.website}</p>
                    <p>Price: ${prod.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="supported-sites">
          <p>Supported: Amazon, Flipkart, Meesho, Westside, H&M, and 500+ stores</p>
        </div>
      </div>
    </div>
  );
};

export default TrackProduct;