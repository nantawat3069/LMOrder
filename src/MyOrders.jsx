import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getStatusBadge } from './utils/badges';

function MyOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) { navigate('/'); return; }
        const u = JSON.parse(storedUser);
        setUser(u);
        fetchOrders(u.id);
    }, []);

    const fetchOrders = async (cid) => {
        const res = await axios.get(`https://lmorder-production.up.railway.app/order.php?action=get_my_orders&customer_id=${cid}`);
        if (res.data.status === 'success') setOrders(res.data.orders);
    };

    const handleCancel = async (oid) => {
        if(!confirm("ต้องการยกเลิกออเดอร์นี้ใช่ไหม?")) return;
        await axios.post('https://lmorder-production.up.railway.app/order.php', { action: 'update_status', order_id: oid, status: 'cancelled' });
        fetchOrders(user.id);
    };

    return (
        <div className="container mt-4 mb-5">
            <div className="d-flex align-items-center mb-4">
                <button onClick={() => navigate('/customer')} className="btn btn-outline-secondary me-3">&larr; กลับ</button>
                <h2>📜 ประวัติการสั่งซื้อของฉัน</h2>
            </div>

            {orders.length === 0 ? <p className="text-center text-muted">ยังไม่มีประวัติการสั่งซื้อ</p> : (
                <div className="row">
                    {orders.map(o => (
                        <div key={o.id} className="col-md-6 mb-3">
                            <div className="card p-3 shadow-sm h-100">
                                <div className="d-flex justify-content-between mb-2">
                                    <h5 className="mb-0">{o.shop_name}</h5>
                                    <div>{getStatusBadge(o.status)}</div>
                                </div>
                                <small className="text-muted">วันที่: {o.order_time}</small>
                                <hr />
                                <ul className="ps-3 mb-2">
                                    {o.items.map((item, index) => (
                                        <li key={index}><small>{item.product_name} x {item.quantity}</small></li>
                                    ))}
                                </ul>
                                <div className="d-flex justify-content-between align-items-end mt-auto">
                                    <div>
                                        <small className="d-block text-muted">ยอดรวม</small>
                                        <h5 className="text-primary mb-0">{parseInt(o.total_price).toLocaleString()} บ.</h5>
                                    </div>
                                    {/* ปุ่มยกเลิก แสดงเฉพาะตอน status pending */}
                                    {o.status === 'pending' && (
                                        <button onClick={() => handleCancel(o.id)} className="btn btn-sm btn-outline-danger">
                                            ยกเลิกออเดอร์
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MyOrders;