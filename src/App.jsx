import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Merchant from './Merchant';
import Customer from './Customer';
import ShopMenu from './ShopMenu';
import MyOrders from './MyOrders';
import ShopHistory from './ShopHistory';
function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/merchant" element={<Merchant />} />
      <Route path="/customer" element={<Customer />} />
      <Route path="/shop/:id" element={<ShopMenu />} />
      <Route path="/my-orders" element={<MyOrders />} />
      <Route path="/shop-history" element={<ShopHistory />} />
    </Routes>
  );
}

export default App;