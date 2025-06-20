import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    potentialSavings: 0,
    nearTarget: 0,
    avgDiscount: 0
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardRes, productsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/dashboard`),
          axios.get(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/products`)
        ]);

        setDashboardData(dashboardRes.data);
        setProducts(productsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your Price Tracking Dashboard</h1>
        <p>Monitor all your tracked products and savings</p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <h3>Total Products</h3>
          <p>Products being tracked</p>
          <div className="stat-value">{dashboardData.totalProducts}</div>
        </div>

        <div className="stat-card">
          <h3>Potential Savings</h3>
          <p>When prices hit targets</p>
          <div className="stat-value">${dashboardData.potentialSavings.toFixed(2)}</div>
        </div>

        <div className="stat-card">
          <h3>Near Target</h3>
          <p>Products close to target price</p>
          <div className="stat-value">{dashboardData.nearTarget}</div>
        </div>

        <div className="stat-card">
          <h3>Avg. Discount</h3>
          <p>Average target discount</p>
          <div className="stat-value">{dashboardData.avgDiscount}%</div>
        </div>
      </div>

      <div className="tracked-products">
        <h2>Your Tracked Products</h2>

        {products.length === 0 ? (
          <p className="no-products">You haven't tracked any products yet.</p>
        ) : (
          <div className="product-list">
            {products.map(product => (
              <div key={product.id} className="product-item">
                <img src={product.image} alt={product.name} />
                <div className="product-details">
                  <h3><Link to={`/product/${product.id}`}>{product.name}</Link></h3>
                  <p className="website">{product.website}</p>
                  <div className="price-info">
                    <span className="current-price">${product.current_price}</span>
                    <span className="target-price">Target: ${product.target_price}</span>
                    {product.current_price <= product.target_price && (
                      <span className="alert-badge">Price Alert!</span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(product.id)}>Delete</button>
                  <button onClick={() => handleEdit(product.id, product.target_price)}>Edit Target Price</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  async function handleDelete(id) {
    try {
      await axios.delete(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/product/${id}`);
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  }

  async function handleEdit(id, currentTargetPrice) {
    const newTargetPrice = prompt('Enter new target price:', currentTargetPrice);
    if (newTargetPrice) {
      try {
        await axios.put(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api/product/${id}`, { targetPrice: parseFloat(newTargetPrice) });
        setProducts(products.map(p => p.id === id ? { ...p, target_price: parseFloat(newTargetPrice) } : p));
      } catch (error) {
        console.error('Error updating product:', error);
      }
    }
  }
};

export default Dashboard;
