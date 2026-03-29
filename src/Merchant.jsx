import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Merchant() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [shop, setShop] = useState(null);
    const [activeTab, setActiveTab] = useState('orders');

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);      
    const [history, setHistory] = useState([]);    
    
    // Menu Form State
    const [newMenu, setNewMenu] = useState({ name: '', price: '', image: null });
    const [optionGroups, setOptionGroups] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);

    // Shop Settings Form State
    const [shopSettings, setShopSettings] = useState({
        user_id: '',
        shop_id: '',
        username: '',
        password: '',
        owner_name: '',
        owner_phone: '',
        shop_name: '',
        description: '',
        shop_address: '',
        shop_image: null,
        shop_image_preview: '',
        bank_name: '',
        bank_account: '',
        bank_account_name: '',
        qr_code: null,
        qr_code_preview: ''
    });
    const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');

    const [reportCustomerModal, setReportCustomerModal] = useState({ show: false, order: null, category: '', message: '' });

    const [viewingSlipMerchant, setViewingSlipMerchant] = useState(null);

    // Ban States
    const [isBanned, setIsBanned] = useState(false);
    const [banInfo, setBanInfo] = useState({ reason: null, message: null });
    const [banAppealMessage, setBanAppealMessage] = useState('');
    const [appealStatus, setAppealStatus] = useState(null);
    const [appealTicketId, setAppealTicketId] = useState(null);

    // Notifications
    const [myNotifications, setMyNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [modal, setModal] = useState({ show: false, type: 'alert', title: '', message: '', onConfirm: null });

    const [copiedOrderId, setCopiedOrderId] = useState(null);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) { navigate('/'); return; }
        const u = JSON.parse(storedUser);
        if (u.role !== 'merchant') { navigate('/customer'); return; }
        setUser(u);

        if (u.is_banned == 1) {
            setIsBanned(true);
            setBanInfo({ reason: u.ban_reason || 'ไม่ระบุ', message: u.ban_message || null });
            fetchAppealStatus(u.id, u.banned_at);
        }

        // ดึงข้อมูลร้านก่อน แล้วค่อยเริ่ม interval
        fetchShopData(u.id).then((shopId) => {
            if (!shopId) return;

            // fetch ครั้งแรกทันที
            fetchOrders(shopId, 'active');
            fetchMyNotifications(u.id);

            // Real-time ทุก 3 วิ
            const interval = setInterval(() => {
                fetchOrders(shopId, 'active');
                fetchMyNotifications(u.id);
            }, 3000);

            // เก็บ interval id ไว้ใน ref เพื่อ cleanup
            window._merchantInterval = interval;
        });

        return () => clearInterval(window._merchantInterval);
    }, []);

    // check_ban real-time
    useEffect(() => {
        if (!user) return;

        const checkBan = async () => {
            try {
                const res = await axios.get(`https://lmorder-production.up.railway.app/customer.php?action=check_ban&user_id=${user.id}`);
                if (res.data.is_banned == 1) {
                    setIsBanned(true);
                    setBanInfo({
                        reason: res.data.ban_reason || 'ไม่ระบุ',
                        message: res.data.ban_message || null
                    });
                    fetchAppealStatus(user.id, res.data.banned_at);
                } else {
                    setIsBanned(false);
                    setBanInfo({ reason: null, message: null });
                    setAppealStatus(null);
                    setAppealTicketId(null);
                }
            } catch (err) { console.error(err); }
        };

        checkBan();
        const banInterval = setInterval(checkBan, 5000);
        return () => clearInterval(banInterval);
    }, [user]);

    // Fetch Settings when tab changes
    useEffect(() => {
        if (activeTab === 'settings' && user) {
            fetchMerchantProfile(user.id);
        }
    }, [activeTab]);

    const showAlert = (title, message) => setModal({ show: true, type: 'alert', title, message, onConfirm: () => setModal({ ...modal, show: false }) });
    const confirmAction = (title, message, action) => setModal({ show: true, type: 'confirm', title, message, onConfirm: () => { action(); setModal({ ...modal, show: false }); } });
    const closeModal = () => setModal({ ...modal, show: false });

    const fetchAppealStatus = async (uid, bannedAt = null) => {
        try {
            let url = `https://lmorder-production.up.railway.app/admin.php?action=get_my_appeal&user_id=${uid}`;
            if (bannedAt) url += `&banned_at=${encodeURIComponent(bannedAt)}`;
            const res = await axios.get(url);
            if (res.data.status === 'success' && res.data.ticket) {
                setAppealStatus(res.data.ticket.status);
                setAppealTicketId(res.data.ticket.id);
            } else {
                setAppealStatus(null);
                setAppealTicketId(null);
            }
        } catch (err) { console.error(err); }
    };

    const handleAppeal = async () => {
        if (!banAppealMessage.trim()) return;
        try {
            await axios.post('https://lmorder-production.up.railway.app/admin.php', {
                action: 'submit_ticket',
                sender_id: user.id,
                target_id: null,
                type: 'request',
                subject: `ขออุทธรณ์การแบน — ${user.fullname}`,
                message: banAppealMessage
            });
            setBanAppealMessage('');
            fetchAppealStatus(user.id);
        } catch (err) { console.error(err); }
    };

    const fetchMyNotifications = async (uid) => {
        try {
            const res = await axios.get(`https://lmorder-production.up.railway.app/admin.php?action=get_my_notifications&user_id=${uid}`);
            if (res.data.status === 'success') {
                setMyNotifications(res.data.notifications);
                setUnreadCount(res.data.unread_count);
            }
        } catch (err) { console.error(err); }
    };

    const markNotificationsRead = async () => {
        if (!user || unreadCount === 0) return;
        try {
            await axios.post('https://lmorder-production.up.railway.app/admin.php', {
                action: 'mark_notifications_read',
                user_id: user.id
            });
            setUnreadCount(0);
            setMyNotifications(prev => prev.map(n => ({ ...n, is_read: '1' })));
        } catch (err) { console.error(err); }
    };

    const handleReportCustomer = async () => {
        if (!reportCustomerModal.category) { showAlert('แจ้งเตือน', 'กรุณาเลือกหมวดหมู่การรายงาน'); return; }
        try {
            await axios.post('https://lmorder-production.up.railway.app/admin.php', {
                action: 'submit_ticket',
                sender_id: user.id,
                target_id: reportCustomerModal.order.customer_id,
                type: 'report',
                subject: `รายงานลูกค้า: ${reportCustomerModal.order.customer_name} — ${reportCustomerModal.category}`,
                message: reportCustomerModal.message || '(ไม่มีข้อความเพิ่มเติม)'
            });
            setReportCustomerModal({ show: false, order: null, category: '', message: '' });
            showAlert('ส่งรายงานแล้ว', '✅ ส่งรายงานถึงแอดมินเรียบร้อยแล้ว');
        } catch (err) { showAlert('ผิดพลาด', 'ไม่สามารถส่งรายงานได้'); }
    };

    //  Data Fetching 
    const fetchShopData = async (ownerId) => {
        const res = await axios.get(`https://lmorder-production.up.railway.app/shop.php?action=get_shop_data&owner_id=${ownerId}`);
        if (res.data.status === 'success') {
            setShop(res.data.shop);
            setProducts(res.data.products);
            setUser({ ...JSON.parse(localStorage.getItem('user')), shop_id: res.data.shop.id });
            return res.data.shop.id; // ← เพิ่ม return
        }
        return null;
    };

    const fetchOrders = async (sid, type) => {
        const res = await axios.get(`https://lmorder-production.up.railway.app/order.php?action=get_shop_orders&shop_id=${sid}&type=${type}`);
        if (res.data.status === 'success') {
            if (type === 'active') {
                const sortedOrders = res.data.orders.sort((a, b) => a.id - b.id);
                setOrders(sortedOrders);
            } else {
                setHistory(res.data.orders);
            }
        }
    };

    // Fetch Profile Data
    const fetchMerchantProfile = async (uid) => {
        try {
            const res = await axios.get(`https://lmorder-production.up.railway.app/shop.php?action=get_merchant_profile&owner_id=${uid}`);
            if (res.data.status === 'success') {
                const d = res.data.data;
                setShopSettings({
                    user_id: d.user_id,
                    shop_id: d.shop_id,
                    username: d.username,
                    password: '',
                    owner_name: d.owner_name,
                    owner_phone: d.owner_phone,
                    shop_name: d.shop_name,
                    description: d.description || '',
                    shop_address: d.shop_address || '',
                    shop_image: null,
                    shop_image_preview: d.shop_image ? `${d.shop_image}` : '',
                    bank_name: d.bank_name || '',
                    bank_account: d.bank_account || '',
                    bank_account_name: d.bank_account_name || '',
                    qr_code: null,
                    qr_code_preview: d.qr_code ? `${d.qr_code}` : ''
                });
            }
        } catch (err) { console.error(err); }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'history' && shop) fetchOrders(shop.id, 'history');
        if (tab === 'orders' && shop) fetchOrders(shop.id, 'active');
    };

    const updateStatus = async (oid, status) => {
        await axios.post('https://lmorder-production.up.railway.app/order.php', { action: 'update_status', order_id: oid, status: status });
        fetchOrders(shop.id, 'active');
    };

    // Menu Management 
    const resetForm = () => {
        setEditingProduct(null);
        setNewMenu({ name: '', price: '', image: null });
        setOptionGroups([]);
        if(document.getElementById('fileInput')) document.getElementById('fileInput').value = "";
    };

    const handleEditClick = (product) => {
        setEditingProduct(product);
        setNewMenu({ name: product.name, price: product.price, image: null });
        setOptionGroups(product.options || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        const action = editingProduct ? 'update_product' : 'add_product';
        const title = editingProduct ? 'บันทึกการแก้ไข' : 'เพิ่มเมนูใหม่';
        
        confirmAction('ยืนยัน', `ต้องการ ${title} ใช่หรือไม่?`, async () => {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('shop_id', shop.id);
            formData.append('name', newMenu.name);
            formData.append('price', newMenu.price);
            formData.append('options', JSON.stringify(optionGroups));
            if (newMenu.image) formData.append('image', newMenu.image);
            if (editingProduct) formData.append('product_id', editingProduct.id);

            await axios.post('https://lmorder-production.up.railway.app/shop.php', formData);
            fetchShopData(user.id);
            resetForm();
            showAlert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');
        });
    };

    const handleDelete = async (pid) => {
        confirmAction('ลบเมนู', 'ต้องการลบเมนูนี้ถาวร ใช่หรือไม่?', async () => {
            await axios.post('https://lmorder-production.up.railway.app/shop.php', { action: 'delete_product', product_id: pid });
            fetchShopData(user.id);
            resetForm();
        });
    };

    const toggleShop = async () => {
        await axios.post('https://lmorder-production.up.railway.app/shop.php', { action: 'toggle_status', shop_id: shop.id, status: shop.is_open == 1 ? 0 : 1 });
        fetchShopData(user.id);
    };

    const toggleProductStatus = async (product) => {
        const newStatus = product.is_available == 1 ? 0 : 1;
        await axios.post('https://lmorder-production.up.railway.app/shop.php', { 
            action: 'toggle_product_status', 
            product_id: product.id, 
            status: newStatus 
        });
        fetchShopData(user.id);
    };

    //  Shop Settings Logic 
    const handleSaveSettings = async () => {
        confirmAction('บันทึกการตั้งค่า', 'ยืนยันการแก้ไขข้อมูลร้านค้า?', async () => {
            const formData = new FormData();
            formData.append('action', 'update_merchant_profile');
            formData.append('user_id', shopSettings.user_id);
            formData.append('shop_id', shopSettings.shop_id);
            formData.append('owner_name', shopSettings.owner_name);
            formData.append('owner_phone', shopSettings.owner_phone);
            formData.append('password', shopSettings.password);
            formData.append('shop_name', shopSettings.shop_name);
            formData.append('description', shopSettings.description);
            formData.append('shop_address', shopSettings.shop_address);
            if (shopSettings.shop_image) formData.append('shop_image', shopSettings.shop_image);
            formData.append('bank_name', shopSettings.bank_name); //ใหม่มะกี้
            formData.append('bank_account', shopSettings.bank_account);
            formData.append('bank_account_name', shopSettings.bank_account_name);
            if (shopSettings.qr_code) formData.append('qr_code', shopSettings.qr_code);
            try {
                const res = await axios.post('https://lmorder-production.up.railway.app/shop.php', formData);
                if(res.data.status === 'success') {
                    showAlert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย');
                    fetchMerchantProfile(user.id); // Reload data
                    setShopSettings({...shopSettings, password: ''});
                    fetchShopData(user.id); // Refresh header info
                } else {
                    showAlert('Error', res.data.message);
                }
            } catch (err) { showAlert('Error', 'เกิดข้อผิดพลาด'); }
        });
    };

    const handleDeleteAccount = () => {
        if (deleteConfirmUsername !== shopSettings.username) {
            showAlert('ผิดพลาด', 'Username ไม่ตรงกัน'); return;
        }
        confirmAction('ลบบัญชีร้านค้า', '⚠️ คำเตือน: ร้านค้า, เมนู และประวัติทั้งหมดจะถูกลบถาวร!', async () => {
            const res = await axios.post('https://lmorder-production.up.railway.app/shop.php', {
                action: 'delete_merchant_account',
                user_id: user.id,
                username_confirmation: deleteConfirmUsername
            });
            if (res.data.status === 'success') {
                localStorage.removeItem('user');
                navigate('/');
            } else { showAlert('Error', res.data.message); }
        });
    };

    // Helper for Settings Image Preview
    const handleShopImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setShopSettings({
                ...shopSettings,
                shop_image: file,
                shop_image_preview: URL.createObjectURL(file)
            });
        }
    };

    const handleQrCodeChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setShopSettings({
                ...shopSettings,
                qr_code: file,
                qr_code_preview: URL.createObjectURL(file)
            });
        }
    };

    // Option Builder Helpers
    const addOptionGroup = () => setOptionGroups([...optionGroups, { name: '', type: 'radio', choices: [{ name: '', price: 0 }] }]);
    const removeOptionGroup = (i) => setOptionGroups(optionGroups.filter((_, idx) => idx !== i));
    const updateOptionGroup = (i, f, v) => { const n = [...optionGroups]; n[i][f] = v; setOptionGroups(n); };
    const addChoice = (gi) => { const n = [...optionGroups]; n[gi].choices.push({ name: '', price: 0 }); setOptionGroups(n); };
    const removeChoice = (gi, ci) => { const n = [...optionGroups]; n[gi].choices = n[gi].choices.filter((_, idx) => idx !== ci); setOptionGroups(n); };
    const updateChoice = (gi, ci, f, v) => { const n = [...optionGroups]; n[gi].choices[ci][f] = v; setOptionGroups(n); };

    const RenderOrderOptions = ({ items }) => (
        <div className="bg-light p-2 rounded mb-2" style={{maxHeight:'150px', overflowY:'auto'}}>
            {items.map((item, idx) => (
                <div key={idx} className="mb-2 border-bottom pb-1">
                    <div className="d-flex justify-content-between"><strong>{item.product_name} x {item.quantity}</strong><small>{parseInt(item.price).toLocaleString()}</small></div>
                    {item.selected_options && item.selected_options.length > 0 && <div className="ps-2 text-muted small">{item.selected_options.map((opt, i) => <div key={i}>- {opt.group}: {opt.name}</div>)}</div>}
                    {item.special_instruction && <div className="ps-2 text-danger small">Note: {item.special_instruction}</div>}
                </div>
            ))}
        </div>
    );

    const getOrderStatusBadge = (status) => {
        const map = {
            pending:    ['bg-secondary', '⏳ รอร้านรับ'],
            accepted:   ['bg-primary',   '✅ รับออเดอร์แล้ว'],
            cooking:    ['bg-warning text-dark', '🍳 กำลังปรุง'],
            delivering: ['bg-info text-dark',    '🛵 กำลังส่ง'],
            completed:  ['bg-success',   '✅ สำเร็จ'],
            cancelled:  ['bg-danger',    '❌ ยกเลิก'],
        };
        const [cls, label] = map[status] || ['bg-secondary', status];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    const getPaymentBadge = (o) => {
        if (o.slip_image) {
            return <span className="badge bg-success">💚 ชำระแล้ว</span>;
        }
        if (o.payment_method === 'เงินสด ปลายทาง') {
            return <span className="badge bg-danger">🔴 ยังไม่ชำระ (เงินสด)</span>;
        }
        if (o.payment_method === 'ธนาคาร/QR-code ปลายทาง') {
            return <span className="badge bg-danger">🔴 ยังไม่ชำระ (โอน)</span>;
        }
        return null;
    };

    if (!shop) return <div className="text-center mt-5">กำลังโหลด...</div>;

    return (
        <div className="container mt-4 pb-5">
            {/* Header / Navbar - Desktop Version */}
            <div className="card shadow-sm p-3 mb-4 sticky-top d-none d-md-block" style={{top: '10px', zIndex: 1000}}>
                <div className="d-flex flex-wrap justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        {shop.image ? (
                            <img src={shop.image} className="rounded-circle me-3 border" style={{width:'50px', height:'50px', objectFit:'cover'}} />
                        ) : (
                            <div className="bg-light rounded-circle me-3 d-flex align-items-center justify-content-center" style={{width:'50px', height:'50px'}}>🏠</div>
                        )}
                        <h3 className="mb-0 text-primary">{shop.shop_name}</h3>
                    </div>
                    <div className="d-flex gap-2">
                        <button className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handleTabChange('orders')}>🔔 ออเดอร์ ({orders.length})</button>
                        <button className={`btn ${activeTab === 'menu' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handleTabChange('menu')}>🍽️ จัดการเมนู</button>
                        <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handleTabChange('history')}>📜 ประวัติ</button>
                        <button
                            className={`btn position-relative ${activeTab === 'notifications' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { handleTabChange('notifications'); markNotificationsRead(); }}
                        >
                            🔔 แจ้งเตือน
                            {unreadCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unreadCount}</span>}
                        </button>
                        <button className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => handleTabChange('settings')}>⚙️ ตั้งค่าร้าน</button>
                        <button className="btn btn-outline-danger" onClick={() => confirmAction('ออกจากระบบ', 'ยืนยัน?', () => { localStorage.removeItem('user'); navigate('/'); })}>ออก</button>
                    </div>
                </div>
            </div>

            {/* Mobile Header with Dropdown Menu */}
            <div className="d-block d-md-none mb-3 pt-2">
                <div className="card shadow-sm p-2 sticky-top" style={{top: '10px', zIndex: 1000}}>
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                            {shop.image ? (
                                <img src={shop.image} className="rounded-circle me-2 border" style={{width:'40px', height:'40px', objectFit:'cover'}} />
                            ) : (
                                <div className="bg-light rounded-circle me-2 d-flex align-items-center justify-content-center" style={{width:'40px', height:'40px'}}>🏠</div>
                            )}
                            <h5 className="mb-0 text-primary fw-bold">{shop.shop_name}</h5>
                        </div>
                        <button 
                            className="btn border-0" 
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            style={{fontSize: '1.5rem'}}
                        >
                            ☰
                        </button>
                    </div>
                    {/* Mobile Dropdown Menu */}
                    {showMobileMenu && (
                        <div className="mt-2 pt-2 border-top">
                            <button 
                                className={`btn w-100 text-start mb-2 ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline-primary'}`} 
                                onClick={() => { handleTabChange('orders'); setShowMobileMenu(false); }}
                            >
                                🔔 ออเดอร์ ({orders.length})
                            </button>
                            <button 
                                className={`btn w-100 text-start mb-2 ${activeTab === 'menu' ? 'btn-primary' : 'btn-outline-primary'}`} 
                                onClick={() => { handleTabChange('menu'); setShowMobileMenu(false); }}
                            >
                                🍽️ จัดการเมนู
                            </button>
                            <button 
                                className={`btn w-100 text-start mb-2 ${activeTab === 'history' ? 'btn-primary' : 'btn-outline-primary'}`} 
                                onClick={() => { handleTabChange('history'); setShowMobileMenu(false); }}
                            >
                                📜 ประวัติ
                            </button>
                            <button
                                className={`btn w-100 text-start mb-2 position-relative ${activeTab === 'notifications' ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => { handleTabChange('notifications'); markNotificationsRead(); setShowMobileMenu(false); }}
                            >
                                🔔 แจ้งเตือน
                                {unreadCount > 0 && <span className="position-absolute top-50 end-10 translate-middle-y badge rounded-pill bg-danger">{unreadCount}</span>}
                            </button>
                            <button 
                                className={`btn w-100 text-start mb-2 ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline-primary'}`} 
                                onClick={() => { handleTabChange('settings'); setShowMobileMenu(false); }}
                            >
                                ⚙️ ตั้งค่าร้าน
                            </button>
                            <button 
                                className="btn w-100 text-start btn-outline-danger" 
                                onClick={() => { confirmAction('ออกจากระบบ', 'ยืนยัน?', () => { localStorage.removeItem('user'); navigate('/'); }); setShowMobileMenu(false); }}
                            >
                                ออก
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* TAB: Orders */}
            {activeTab === 'orders' && (
                <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4>รายการคำสั่งซื้อ</h4>
                        <div className="d-flex align-items-center">
                            <span className="me-3 fw-bold">สถานะ: {shop.is_open == 1 ? <span className="text-success">🟢 เปิดร้านอยู่</span> : <span className="text-secondary">🔴 ปิดร้านอยู่</span>}</span>
                            <button onClick={toggleShop} className={`btn ${shop.is_open == 1 ? 'btn-warning' : 'btn-success'}`} style={{ minWidth: '120px' }}>{shop.is_open == 1 ? 'กดปิดร้าน' : 'กดเปิดร้าน'}</button>
                        </div>
                    </div>
                    {orders.length === 0 ? <div className="alert alert-info text-center py-5"><h4>ไม่มีออเดอร์ใหม่ 😴</h4></div> : (
                        <div className="row">
                            {orders.map(o => (
                                <div key={o.id} className="col-md-6 col-lg-4 mb-3">
                                    <div className="card p-3 shadow border-0 h-100">
                                        {/* Header: Order ID + สถานะ */}
                                        <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                                            <strong className="text-primary">Order #{o.id}</strong>
                                            {getOrderStatusBadge(o.status)}
                                        </div>

                                        {/* ลูกค้า + ที่อยู่ */}
                                        <div className="d-flex align-items-center justify-content-between mb-1">
                                            <p className="mb-0"><strong>ลูกค้า:</strong> {o.customer_name}</p>
                                            <button
                                                className="btn btn-sm btn-outline-secondary py-0 px-2"
                                                style={{fontSize: '0.9rem'}}
                                                onClick={() => {
                                                    navigator.clipboard.writeText(o.customer_phone);
                                                    setCopiedOrderId(o.id);
                                                    setTimeout(() => setCopiedOrderId(null), 2000);
                                                }}
                                            >
                                                {copiedOrderId === o.id ? 'คัดลอกแล้ว' : `เบอร์ : ${o.customer_phone}`}
                                            </button>
                                        </div>
                                        <p className="mb-2"><strong>ที่อยู่:</strong> {o.address}</p>

                                        {/* รายการอาหาร */}
                                        <RenderOrderOptions items={o.items} />

                                        <div className="mt-auto">
                                            {/* ยอดรวม + การชำระ */}
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <h5 className="text-primary mb-0">{parseInt(o.total_price).toLocaleString()} บ.</h5>
                                                <div className="d-flex align-items-center gap-2">
                                                    {getPaymentBadge(o)}
                                                    {o.slip_image && (
                                                        <button
                                                            className="btn btn-sm btn-outline-primary py-0"
                                                            onClick={() => setViewingSlipMerchant(`${o.slip_image}`)}
                                                        >
                                                            🧾 ดูสลิป
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ปุ่มดำเนินการ */}
                                            <div className="d-grid gap-2">
                                                {o.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => updateStatus(o.id, 'accepted')} className="btn btn-success">รับออเดอร์</button>
                                                        <button onClick={() => updateStatus(o.id, 'cancelled')} className="btn btn-outline-danger">ปฏิเสธ</button>
                                                    </>
                                                )}
                                                {o.status === 'accepted' && <button onClick={() => updateStatus(o.id, 'cooking')} className="btn btn-warning">🍳 เริ่มปรุงอาหาร</button>}
                                                {o.status === 'cooking' && <button onClick={() => updateStatus(o.id, 'delivering')} className="btn btn-info text-white">🛵 พร้อมส่ง</button>}
                                                {o.status === 'delivering' && <button onClick={() => updateStatus(o.id, 'completed')} className="btn btn-primary">✅ จบงาน</button>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Menu */}
            {activeTab === 'menu' && (
                <div className="row">
                    <div className="col-md-8">
                        <h4>รายการเมนู</h4>
                        <div className="row">
                            {products.map(p => (
                                <div key={p.id} className="col-md-6 mb-3">
                                    <div className="card h-100 p-2 flex-row align-items-center" 
                                         style={{ 
                                             backgroundColor: p.is_available == 0 ? '#dcdcdc' : '#ffffff', 
                                             transition: 'background-color 0.3s ease'
                                         }}>
                                        <div style={{position: 'relative'}}>
                                            <img src={p.image ? `${p.image}` : "https://placehold.co/100"} 
                                                 style={{width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', opacity: p.is_available == 0 ? 0.5 : 1, filter: p.is_available == 0 ? 'grayscale(100%)' : 'none'}} 
                                            />
                                            {p.is_available == 0 && <span className="position-absolute top-50 start-50 translate-middle badge bg-danger" style={{fontSize: '0.6rem'}}>หมด</span>}
                                        </div>
                                        <div className="ms-3 flex-grow-1">
                                            <h6 className="mb-0">{p.name}</h6>
                                            <small className="text-primary">{parseInt(p.price).toLocaleString()} บ.</small>
                                        </div>
                                        <div className="d-flex flex-column gap-2 ms-2">
                                            <button onClick={() => toggleProductStatus(p)} className={`btn btn-sm ${p.is_available == 1 ? 'btn-soft-success' : 'btn-secondary'} py-1 px-2`} style={{fontSize:'0.8rem'}}>
                                                {p.is_available == 1 ? 'เปิดอยู่' : 'ปิดชั่วคราว'}
                                            </button>
                                            <button onClick={() => handleEditClick(p)} className="btn btn-sm btn-soft-primary py-1 px-2" style={{fontSize:'0.8rem'}}>แก้ไข</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card p-4 shadow-sm sticky-top" style={{top: '80px'}}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">{editingProduct ? `✏️ แก้ไข: ${editingProduct.name}` : '➕ เพิ่มเมนู'}</h5>
                                {editingProduct && <button onClick={() => handleDelete(editingProduct.id)} className="btn btn-sm btn-outline-danger">ลบเมนู</button>}
                            </div>
                            <form onSubmit={handleSaveProduct}>
                                <div className="mb-2"><label>ชื่อ</label><input className="form-control" value={newMenu.name} onChange={e => setNewMenu({...newMenu, name: e.target.value})} required /></div>
                                <div className="mb-2"><label>ราคา</label><input type="number" className="form-control" value={newMenu.price} onChange={e => setNewMenu({...newMenu, price: e.target.value})} required /></div>
                                <div className="mb-3">
                                    <label>รูป {editingProduct && <small className="text-muted">(ไม่ต้องเลือกถ้าไม่เปลี่ยน)</small>}</label>
                                    <input id="fileInput" type="file" className="form-control" accept="image/*" onChange={e => setNewMenu({...newMenu, image: e.target.files[0]})} required={!editingProduct} />
                                </div>
                                <hr /><h6>ตัวเลือกเสริม</h6>
                                {optionGroups.map((group, gIdx) => (
                                    <div key={gIdx} className="border p-2 mb-2 rounded bg-light">
                                        <div className="d-flex gap-2 mb-2">
                                            <input className="form-control form-control-sm" placeholder="ชื่อกลุ่ม" value={group.name} onChange={e => updateOptionGroup(gIdx, 'name', e.target.value)} required />
                                            <select className="form-select form-select-sm" value={group.type} onChange={e => updateOptionGroup(gIdx, 'type', e.target.value)} style={{width: '160px'}}><option value="radio">เลือก 1</option><option value="checkbox">หลาย</option></select>
                                            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeOptionGroup(gIdx)}>X</button>
                                        </div>
                                        {group.choices.map((choice, cIdx) => (
                                            <div key={cIdx} className="d-flex gap-2 mb-1 ps-3">
                                                <input className="form-control form-control-sm" placeholder="ชื่อ" value={choice.name} onChange={e => updateChoice(gIdx, cIdx, 'name', e.target.value)} required />
                                                <input type="number" className="form-control form-control-sm" placeholder="+ราคา" value={choice.price} onChange={e => updateChoice(gIdx, cIdx, 'price', e.target.value)} style={{width: '80px'}} />
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeChoice(gIdx, cIdx)}>-</button>
                                            </div>
                                        ))}
                                        <button type="button" className="btn btn-sm btn-link pt-0" onClick={() => addChoice(gIdx)}>+ ตัวเลือก</button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-outline-primary w-100 mb-3" onClick={addOptionGroup}>+ เพิ่มกลุ่มตัวเลือก</button>
                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-primary flex-fill">{editingProduct ? 'บันทึกแก้ไข' : 'เพิ่มเมนู'}</button>
                                    {editingProduct && <button type="button" onClick={resetForm} className="btn btn-secondary">ยกเลิก</button>}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: History */}
            {activeTab === 'history' && (
                <div>
                    <h4 className="mb-4">ประวัติยอดขาย (ออเดอร์ที่เสร็จสิ้น)</h4>
                    {history.length === 0 ? (
                        <div className="text-center text-muted py-5">ยังไม่มีประวัติการขาย</div>
                    ) : (
                        <div className="row">
                            {history.map(o => (
                                <div key={o.id} className="col-md-6 col-lg-4 mb-3">
                                    <div className="card p-3 shadow-sm h-100 border-0">
                                        {/* Header */}
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <h6 className="mb-0 fw-bold text-primary">#{o.id}</h6>
                                                <small className="text-muted">{o.order_time?.split(' ')[0]} {o.order_time?.split(' ')[1]?.substring(0,5)}</small>
                                            </div>
                                            {o.status === 'completed'
                                                ? <span className="badge bg-success rounded-pill px-3 py-2">✅ สำเร็จ</span>
                                                : <span className="badge bg-danger rounded-pill px-3 py-2">❌ ยกเลิก</span>
                                            }
                                        </div>

                                        {/* ลูกค้า */}
                                        <div className="mb-2">
                                            <span className="fw-bold">👤 {o.customer_name}</span>
                                            <small className="text-muted ms-2">{o.customer_phone}</small>
                                        </div>

                                        {/* ที่อยู่ */}
                                        <small className="text-muted d-block mb-2">📍 {o.address}</small>

                                        {/* รายการอาหาร */}
                                        <div className="bg-light p-2 rounded mb-2">
                                            <RenderOrderOptions items={o.items} />
                                        </div>

                                        {/* ล่างสุด: ราคา + วิธีชำระ + ปุ่ม */}
                                        <div className="d-flex justify-content-between align-items-end mt-auto pt-2">
                                            <div>
                                                <small className="d-block text-muted">ยอดรวม</small>
                                                <h5 className="text-primary mb-0">{parseInt(o.total_price).toLocaleString()} บ.</h5>
                                                {o.payment_method && (
                                                    <small className="text-muted">{o.payment_method}</small>
                                                )}
                                            </div>
                                            <div className="d-flex gap-2">
                                                {/* ปุ่มดูสลิป */}
                                                {o.slip_image && (
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => setViewingSlipMerchant(`${o.slip_image}`)}
                                                    >
                                                        🧾 ดูสลิป
                                                    </button>
                                                )}
                                                {/* ปุ่มรายงาน */}
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => setReportCustomerModal({ show: true, order: o, category: '', message: '' })}
                                                >
                                                    🚨 รายงาน
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Notifications */}
            {activeTab === 'notifications' && (
                <div className="card shadow-sm p-4" style={{maxWidth: '700px', margin: '0 auto'}}>
                    <h4 className="mb-4">🔔 การแจ้งเตือน</h4>
                    {myNotifications.length === 0 ? (
                        <div className="text-center text-muted py-5">
                            <div style={{fontSize: '3rem'}}>🔕</div>
                            <div className="mt-2">ยังไม่มีการแจ้งเตือน</div>
                        </div>
                    ) : (
                        <div>
                            {myNotifications.map((n, i) => {
                                const typeIcon = { ban: '🔨', unban: '✅', ticket_update: '📋', admin_message: '📢' }[n.type] || '🔔';
                                const typeBg = { ban: '#fff5f5', unban: '#f0fff4', ticket_update: '#fffbeb', admin_message: '#f0f8ff' }[n.type] || '#ffffff';
                                const typeBorder = { ban: '#fc8181', unban: '#68d391', ticket_update: '#f6ad55', admin_message: '#63b3ed' }[n.type] || '#e2e8f0';
                                return (
                                    <div key={i} className="mb-3 p-3 rounded border"
                                        style={{ background: typeBg, borderColor: typeBorder, borderLeft: `4px solid ${typeBorder}`, opacity: n.is_read == '1' ? 0.75 : 1 }}>
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <div className="d-flex align-items-center gap-2">
                                                <span style={{fontSize: '1.2rem'}}>{typeIcon}</span>
                                                <strong className="small">{n.category}</strong>
                                                {n.is_read == '0' && <span className="badge bg-danger" style={{fontSize: '0.6rem'}}>ใหม่</span>}
                                            </div>
                                            <small className="text-muted">{n.created_at?.split(' ')[0]} {n.created_at?.split(' ')[1]?.substring(0,5)}</small>
                                        </div>
                                        <p className="mb-1 small">{n.message}</p>
                                        {n.admin_name && <small className="text-muted">โดย: {n.admin_name}</small>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Settings */}
            {activeTab === 'settings' && (
                <div className="card shadow-sm p-4 mx-auto" style={{maxWidth: '800px'}}>
                    <h3 className="mb-4 text-primary">⚙️ ตั้งค่าบัญชีร้านค้า</h3>
                    
                    <div className="text-center mb-4">
                        <div style={{width: '120px', height: '120px', margin: '0 auto', position: 'relative'}}>
                            {shopSettings.shop_image_preview ? (
                                <img src={shopSettings.shop_image_preview} className="rounded-circle border shadow-sm" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                            ) : (
                                <div className="bg-light rounded-circle border d-flex align-items-center justify-content-center" style={{width: '100%', height: '100%', fontSize: '40px'}}>🏠</div>
                            )}
                            <label 
                                className="btn btn-sm btn-primary position-absolute bottom-0 end-0 rounded-circle d-flex align-items-center justify-content-center" 
                                style={{
                                    width: '36px', 
                                    height: '36px', 
                                    padding: 0,
                                    fontSize: '1.8rem'
                                }}
                            >
                                📷 
                                <input type="file" hidden accept="image/*" onChange={handleShopImageChange} />
                            </label>
                        </div>
                        <small className="text-muted mt-2 d-block">แตะที่รูปเพื่อแก้ไขโลโก้ร้าน</small>
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold">ชื่อร้านค้า</label>
                            <input className="form-control" value={shopSettings.shop_name} onChange={e => setShopSettings({...shopSettings, shop_name: e.target.value})} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold text-muted">Username (แก้ไขไม่ได้)</label>
                            <input className="form-control bg-light" value={shopSettings.username} disabled />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold">คำอธิบายร้าน / ประกาศ</label>
                        <textarea className="form-control" rows="3" placeholder="เช่น ร้านอาหารตามสั่ง รสเด็ด เปิดทุกวัน..." value={shopSettings.description} onChange={e => setShopSettings({...shopSettings, description: e.target.value})}></textarea>
                    </div>

                    <hr className="my-4"/>
                    <h5 className="mb-3 text-muted">👤 ข้อมูลเจ้าของร้าน</h5>

                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold">ชื่อ-นามสกุล เจ้าของ</label>
                            <input className="form-control" value={shopSettings.owner_name} onChange={e => setShopSettings({...shopSettings, owner_name: e.target.value})} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold">เบอร์ติดต่อ</label>
                            <input className="form-control" value={shopSettings.owner_phone} onChange={e => setShopSettings({...shopSettings, owner_phone: e.target.value})} />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold">ที่อยู่ร้านค้า</label>
                        <textarea className="form-control" rows="2" placeholder="เลขที่, ถนน, แขวง/ตำบล..." value={shopSettings.shop_address} onChange={e => setShopSettings({...shopSettings, shop_address: e.target.value})}></textarea>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-bold">เปลี่ยนรหัสผ่าน <small className="text-muted fw-normal">(เว้นว่างถ้าไม่เปลี่ยน)</small></label>
                        <input className="form-control" type="password" placeholder="รหัสผ่านใหม่" value={shopSettings.password} onChange={e => setShopSettings({...shopSettings, password: e.target.value})} />
                    </div>

                    <hr className="my-4"/>
                    <h5 className="mb-3 text-muted">💳 ข้อมูลการรับชำระเงิน</h5>

                    <div className="row mb-3">
                        <div className="col-md-4 mb-3">
                            <label className="form-label fw-bold">ธนาคาร</label>
                            <select className="form-select" value={shopSettings.bank_name} onChange={e => setShopSettings({...shopSettings, bank_name: e.target.value})}>
                                <option value="">-- เลือกธนาคาร --</option>
                                {['กสิกรไทย (KBANK)', 'ไทยพาณิชย์ (SCB)', 'กรุงเทพ (BBL)', 'กรุงไทย (KTB)', 'กรุงศรี (BAY)', 'ทหารไทยธนชาต (TTB)', 'ออมสิน (GSB)', 'ธ.ก.ส. (BAAC)', 'ซีไอเอ็มบีไทย (CIMB)', 'พร้อมเพย์ (PromptPay)'].map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="form-label fw-bold">เลขบัญชี / เบอร์พร้อมเพย์</label>
                            <input
                                className="form-control"
                                placeholder="เช่น 123-4-56789-0"
                                value={shopSettings.bank_account}
                                onChange={e => setShopSettings({...shopSettings, bank_account: e.target.value})}
                            />
                        </div>
                        <div className="col-md-4 mb-3">
                            <label className="form-label fw-bold">ชื่อบัญชี</label>
                            <input
                                className="form-control"
                                placeholder="ชื่อเจ้าของบัญชี"
                                value={shopSettings.bank_account_name}
                                onChange={e => setShopSettings({...shopSettings, bank_account_name: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold">QR Code สำหรับรับเงิน</label>
                        <div className="d-flex align-items-start gap-4">
                            {/* Preview รูป QR */}
                            <div className="border rounded p-2 bg-light text-center" style={{minWidth: '130px'}}>
                                {shopSettings.qr_code_preview ? (
                                    <img
                                        src={shopSettings.qr_code_preview}
                                        alt="QR Code"
                                        style={{width: '120px', height: '120px', objectFit: 'contain'}}
                                    />
                                ) : (
                                    <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{width: '120px', height: '120px'}}>
                                        <span style={{fontSize: '2.5rem'}}>📷</span>
                                        <small>ยังไม่มีรูป</small>
                                    </div>
                                )}
                            </div>
                            {/* ปุ่มอัปโหลด */}
                            <div>
                                <label className="btn btn-outline-primary mb-2">
                                    📁 เลือกรูป QR Code
                                    <input type="file" hidden accept="image/*" onChange={handleQrCodeChange} />
                                </label>
                                <div className="text-muted small">รองรับ JPG, PNG — แนะนำให้ใช้รูปสี่เหลี่ยมจัตุรัส</div>
                                {shopSettings.qr_code_preview && (
                                    <button
                                        className="btn btn-sm btn-outline-danger mt-2"
                                        onClick={() => setShopSettings({...shopSettings, qr_code: null, qr_code_preview: ''})}
                                    >
                                        ✕ ลบรูป QR
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="d-grid gap-2">
                        <button className="btn btn-primary py-2" onClick={handleSaveSettings}>💾 บันทึกการเปลี่ยนแปลง</button>
                    </div>

                    <hr className="my-5"/>

                    <div className="bg-soft-danger p-3 rounded border border-danger">
                        <h5 className="text-danger">⚠️ โซนอันตราย: ลบบัญชีร้านค้าถาวร</h5>
                        <p className="text-muted small">หากลบบัญชี ข้อมูลร้านค้า, เมนู, และประวัติทั้งหมดจะหายไปและกู้คืนไม่ได้</p>
                        <div className="mb-3">
                            <label className="form-label small">พิมพ์ Username <strong>"{shopSettings.username}"</strong> เพื่อยืนยัน</label>
                            <input className="form-control" placeholder={`พิมพ์ ${shopSettings.username} ที่นี่`} value={deleteConfirmUsername} onChange={e => setDeleteConfirmUsername(e.target.value)} />
                        </div>
                        <button className="btn btn-danger w-100" disabled={deleteConfirmUsername !== shopSettings.username} onClick={handleDeleteAccount}>ยืนยันลบบัญชีถาวร</button>
                    </div>
                </div>
            )}

            {/* Popup ดูสลิป */}
            {viewingSlipMerchant && (
                <div className="modal-overlay" onClick={() => setViewingSlipMerchant(null)}>
                    <div className="modal-box" style={{maxWidth: '420px'}} onClick={e => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">🧾 สลิปการโอน</h5>
                            <button className="btn-close" onClick={() => setViewingSlipMerchant(null)}></button>
                        </div>
                        <img src={viewingSlipMerchant} alt="slip" style={{width: '100%', borderRadius: '12px', border: '1px solid #eee'}} />
                        <button className="btn btn-secondary w-100 mt-3" onClick={() => setViewingSlipMerchant(null)}>ปิด</button>
                    </div>
                </div>
            )}

            {/* Popup รายงานลูกค้า */}
            {reportCustomerModal.show && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{maxWidth: '480px'}}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="mb-0 text-danger">🚨 รายงานลูกค้า</h4>
                            <button className="btn-close" onClick={() => setReportCustomerModal({ show: false, order: null, category: '', message: '' })}></button>
                        </div>
                        <p className="text-muted small mb-3">
                            ลูกค้า: <strong>{reportCustomerModal.order?.customer_name}</strong>
                            <span className="ms-2 text-muted">({reportCustomerModal.order?.customer_phone})</span>
                            <br/>ออเดอร์: <strong>#{reportCustomerModal.order?.id}</strong>
                        </p>

                        <div className="mb-3">
                            <label className="form-label fw-bold">หมวดหมู่การรายงาน <span className="text-danger">*</span></label>
                            <div className="d-flex flex-wrap gap-2">
                                {[
                                    'สแปมออเดอร์',
                                    'ยกเลิกซ้ำๆ',
                                    'พฤติกรรมก้าวร้าว',
                                    'ข้อมูลปลอม',
                                    'ไม่รับสินค้า',
                                    'อื่นๆ'
                                ].map(cat => (
                                    <button
                                        key={cat}
                                        className={`btn btn-sm ${reportCustomerModal.category === cat ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        onClick={() => setReportCustomerModal({ ...reportCustomerModal, category: cat })}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold">รายละเอียดเพิ่มเติม</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                placeholder="อธิบายเพิ่มเติม (ไม่บังคับ)..."
                                value={reportCustomerModal.message}
                                onChange={e => setReportCustomerModal({ ...reportCustomerModal, message: e.target.value })}
                            />
                        </div>

                        <div className="d-flex gap-2">
                            <button className="btn btn-secondary flex-fill" onClick={() => setReportCustomerModal({ show: false, order: null, category: '', message: '' })}>ยกเลิก</button>
                            <button className="btn btn-danger flex-fill" onClick={handleReportCustomer}>ส่งรายงาน</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup แจ้งโดนแบน */}
            {isBanned && (
                <div className="modal-overlay" style={{zIndex: 99999}}>
                    <div className="modal-box" style={{maxWidth: '480px'}}>
                        <div className="text-center mb-3">
                            <div style={{fontSize: '3rem'}}>🔨</div>
                            <h3 className="text-danger mb-1">บัญชีถูกระงับ</h3>
                            <p className="text-muted mb-0">บัญชีร้านค้าของคุณถูกแอดมินระงับการใช้งาน</p>
                        </div>

                        {/* เหตุผลการแบน */}
                        <div className="alert alert-danger py-2 mb-3 text-start">
                            <strong>เหตุผล:</strong> {banInfo.reason || 'ไม่ระบุ'}
                            {banInfo.message && <div className="mt-1 small">{banInfo.message}</div>}
                        </div>

                        {/* สถานะคำร้อง */}
                        {appealStatus && (
                            <div className={`alert py-2 mb-3 text-center fw-bold ${
                                appealStatus === 'open'        ? 'alert-secondary' :
                                appealStatus === 'in_progress' ? 'alert-warning'   :
                                appealStatus === 'resolved'    ? 'alert-success'   :
                                appealStatus === 'rejected'    ? 'alert-danger'    : 'alert-secondary'
                            }`}>
                                {{
                                    open:        '⏳ รอแอดมินรับเรื่อง',
                                    in_progress: '🔄 แอดมินกำลังดำเนินการ',
                                    resolved:    '✅ คำร้องเสร็จสิ้น',
                                    rejected:    '❌ คำร้องถูกปฏิเสธ',
                                }[appealStatus]}
                            </div>
                        )}

                        {/* ฟอร์มส่งคำร้อง */}
                        {(appealStatus === null || appealStatus === 'resolved' || appealStatus === 'rejected') ? (
                            <div className="mb-3">
                                <label className="form-label fw-bold">📝 คำร้องขออุทธรณ์</label>
                                {appealStatus === 'resolved' && <div className="small text-muted mb-2">คำร้องก่อนหน้าเสร็จสิ้นแล้ว สามารถส่งใหม่ได้</div>}
                                {appealStatus === 'rejected' && <div className="small text-muted mb-2">คำร้องก่อนหน้าถูกปฏิเสธ สามารถส่งใหม่ได้</div>}
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    placeholder="อธิบายเหตุผลที่ควรได้รับการปลดแบน..."
                                    value={banAppealMessage}
                                    onChange={e => setBanAppealMessage(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="alert alert-light border mb-3 small text-muted text-center">
                                🔒 ไม่สามารถส่งคำร้องได้ในขณะนี้<br/>กรุณารอแอดมินพิจารณาคำร้องที่ส่งไปแล้ว
                            </div>
                        )}

                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-outline-danger flex-fill"
                                onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
                            >
                                ออกจากระบบ
                            </button>
                            {(appealStatus === null || appealStatus === 'resolved' || appealStatus === 'rejected') && (
                                <button
                                    className="btn btn-primary flex-fill"
                                    disabled={!banAppealMessage.trim()}
                                    onClick={handleAppeal}
                                >
                                    ส่งคำร้อง
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {modal.show && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h4 className="mb-3">{modal.title}</h4>
                        <p className="text-muted mb-4">{modal.message}</p>
                        <div className="d-flex justify-content-center gap-2">
                            {modal.type === 'confirm' && <button className="btn btn-secondary flex-fill" onClick={closeModal}>ยกเลิก</button>}
                            <button className="btn btn-primary flex-fill" onClick={modal.onConfirm}>ตกลง</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Merchant;