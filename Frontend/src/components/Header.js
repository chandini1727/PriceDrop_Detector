import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <h1>PriceGuardian</h1>
          <p>Smart Price Drop Detection</p>
        </Link>
        <nav>
          <ul>
            <li><Link to="/">Track Product</Link></li>
            <li><Link to="/dashboard">Dashboard</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
