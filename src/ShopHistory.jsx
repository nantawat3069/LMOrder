import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function ShopHistory() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) navigate('/');
        const u = JSON.parse(storedUser);
        if(u.role !== 'merchant') navigate('/customer');

        if(u.shop_id) fetchHistory(u.shop_id);
        else {

             axios.get(`https://lmorder-production.up.railway.app/shop.php?action=get_shop_data&owner_id=${u.id}`)
                .then(res => fetchHistory(res.data.shop.id));
        }
    }, []);

    const fetchHistory = async (sid) => {
        const res = await axios.get(`https://lmorder-production.up.railway.app/order.php?action=get_shop_orders&shop_id=${sid}&type=history`);
        if (res.data.status === 'success') setOrders(res.data.orders);
    };

    return (
        <div className="container mt-4">
            <div className="d-flex align-items-center mb-4">
                <button onClick={() => navigate('/merchant')} className="btn btn-outline-secondary me-3">&larr; กลับหน้าร้าน</button>
                <h2>📜 ประวัติยอดขาย (ออเดอร์ที่เสร็จสิ้น)</h2>
            </div>
            
            <table className="table table-bordered bg-white shadow-sm rounded">
                <thead className="table-light">
                    <tr>
                        <th>Order ID</th>
                        <th>ลูกค้า</th>
                        <th>รายการอาหาร</th>
                        <th>ยอดรวม</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(o => (
                        <tr key={o.id}>
                            <td>#{o.id}</td>
                            <td>{o.customer_name}</td>
                            <td>
                                {o.items.map((i, idx) => (
                                    <div key={idx}><small>{i.product_name} x {i.quantity}</small></div>
                                ))}
                            </td>
                            <td>{parseInt(o.total_price).toLocaleString()} บ.</td>
                            <td>
                                {o.status === 'completed' ? 
                                    <span className="text-success">สำเร็จ</span> : 
                                    <span className="text-danger">ยกเลิก</span>
                                }
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ShopHistory;