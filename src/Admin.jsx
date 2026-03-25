import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://192.168.1.36/LMOrder/api';

function OrderRow({ order, role }) {
    const [open, setOpen] = useState(false);

    const getStatusBadge = (status) => {
        const map = {
            pending:    ['bg-secondary', 'รอร้านรับ'],
            accepted:   ['bg-primary',   'รับแล้ว'],
            cooking:    ['bg-warning text-dark', 'กำลังปรุง'],
            delivering: ['bg-info text-dark',    'กำลังส่ง'],
            completed:  ['bg-success',   'สำเร็จ'],
            cancelled:  ['bg-danger',    'ยกเลิก'],
        };
        const [cls, label] = map[order.status] || ['bg-secondary', order.status];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    return (
        <>
            <tr>
                <td className="text-muted">#{order.id}</td>
                <td>
                    <div>{order.order_time?.split(' ')[0]}</div>
                    <small className="text-muted">{order.order_time?.split(' ')[1]?.substring(0,5)}</small>
                </td>
                <td>
                    {role === 'merchant' ? (
                        <>
                            <div>{order.customer_name || '-'}</div>
                            <small className="text-muted">@{order.customer_username || '-'}</small>
                        </>
                    ) : (
                        <>
                            <div>{order.shop_name}</div>
                            <small className="text-muted">@{order.shop_username || '-'}</small>
                        </>
                    )}
                </td>
                <td className="text-primary fw-bold">{parseInt(order.total_price).toLocaleString()} บ.</td>
                <td>{getStatusBadge(order.status)}</td>
                <td>
                    <button
                        className="btn btn-sm btn-outline-secondary py-0 px-2"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? '▲ ซ่อน' : '▼ ดู'}
                    </button>
                </td>
            </tr>

            {/* Dropdown รายละเอียด */}
            {open && (
                <tr>
                    <td colSpan={6} className="bg-light p-0">
                        <div className="p-3">
                            <div className="mb-1 small text-muted fw-bold">รายการที่สั่ง:</div>
                            {order.items && order.items.length > 0 ? (
                                order.items.map((item, idx) => (
                                    <div key={idx} className="d-flex justify-content-between small border-bottom py-1">
                                        <div>
                                            <span>{item.product_name}</span>
                                            <span className="text-muted ms-2">x {item.quantity}</span>
                                            {item.special_instruction && (
                                                <div className="text-danger small">Note: {item.special_instruction}</div>
                                            )}
                                        </div>
                                        <span className="text-primary">{parseInt(item.price).toLocaleString()} บ.</span>
                                    </div>
                                ))
                            ) : (
                                <small className="text-muted">ไม่มีข้อมูลรายการ</small>
                            )}
                            <div className="d-flex justify-content-between fw-bold small mt-2">
                                <span>รวม</span>
                                <span className="text-primary">{parseInt(order.total_price).toLocaleString()} บ.</span>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

function Admin() {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [activeTab, setActiveTab] = useState('users');

    //  Users Tab 
    const [users, setUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetail, setUserDetail] = useState(null);
    const [editForm, setEditForm] = useState(null);

    //  Orders (ใน User Detail) 
    const [orderSearch, setOrderSearch] = useState('');         // ← ตรงนี้
    const [orderStatusFilter, setOrderStatusFilter] = useState('all'); // ← ตรงนี้

    //  Tickets Tab 
    const [tickets, setTickets] = useState([]);
    const [ticketSearch, setTicketSearch] = useState('');
    const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
    const [selectedTicket, setSelectedTicket] = useState(null);

    //  Logs Tab 
    const [logs, setLogs] = useState([]);
    const [logSearch, setLogSearch] = useState('');           // ← เพิ่ม
    const [logActionFilter, setLogActionFilter] = useState('all'); // ← เพิ่ม

    //  Modal 
    const [modal, setModal] = useState({ show: false, type: 'alert', title: '', message: '', onConfirm: null });

    // 
    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (!stored) { navigate('/'); return; }
        const u = JSON.parse(stored);
        if (u.role !== 'admin') { navigate('/'); return; }
        setAdmin(u);
        fetchUsers(u);
    }, []);

    useEffect(() => {
        if (admin) fetchUsers();
    }, [userSearch, userRoleFilter]);

    useEffect(() => {
        if (activeTab === 'tickets') fetchTickets();
        if (activeTab === 'logs') fetchLogs();
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'tickets') fetchTickets();
    }, [ticketSearch, ticketStatusFilter]);

    useEffect(() => {
        if (activeTab === 'logs') fetchLogs();
    }, [logSearch, logActionFilter]);

    useEffect(() => {
        if (selectedUser) fetchUserDetail(selectedUser.id);
    }, [orderSearch, orderStatusFilter]);

    //  API helpers 
    const fetchUsers = async (adminUser) => {
        const a = adminUser || admin;
        try {
            const params = new URLSearchParams({ action: 'get_users' });
            if (userSearch) params.append('search', userSearch);
            if (userRoleFilter !== 'all') params.append('role', userRoleFilter);
            const res = await axios.get(`${API}/admin.php?${params}`);
            if (res.data.status === 'success') setUsers(res.data.users);
        } catch (e) { console.error(e); }
    };

    const fetchUserDetail = async (uid) => {
        try {
            const params = new URLSearchParams({ 
                action: 'get_user_detail', 
                user_id: uid,
                order_search: orderSearch,
                order_status: orderStatusFilter
            });
            const res = await axios.get(`${API}/admin.php?${params}`);
            if (res.data.status === 'success') {
                setUserDetail(res.data);
                setEditForm({
                    fullname: res.data.user.fullname,
                    phone: res.data.user.phone,
                    shop_name: res.data.user.shop_name || '',
                    description: res.data.user.description || ''
                });
            }
        } catch (e) { console.error(e); }
    };

    const fetchTickets = async () => {
        try {
            const params = new URLSearchParams({ action: 'get_tickets' });
            if (ticketSearch) params.append('search', ticketSearch);
            if (ticketStatusFilter !== 'all') params.append('status', ticketStatusFilter);
            const res = await axios.get(`${API}/admin.php?${params}`);
            if (res.data.status === 'success') setTickets(res.data.tickets);
        } catch (e) { console.error(e); }
    };

    const fetchLogs = async () => {
        try {
            const params = new URLSearchParams({ action: 'get_logs' });
            if (logSearch) params.append('search', logSearch);
            if (logActionFilter !== 'all') params.append('action_filter', logActionFilter);
            const res = await axios.get(`${API}/admin.php?${params}`);
            if (res.data.status === 'success') setLogs(res.data.logs);
        } catch (e) { console.error(e); }
    };

    //  Actions 
    const handleToggleBan = (targetUser) => {
        const isBanning = targetUser.is_banned == 0;
        const actionText = isBanning ? 'แบน' : 'ปลดแบน';
        confirmAction(
            `${actionText}ผู้ใช้`,
            `ยืนยันที่จะ${actionText} "${targetUser.fullname}" (${targetUser.username}) ใช่หรือไม่?`,
            async () => {
                await axios.post(`${API}/admin.php`, {
                    action: 'toggle_ban',
                    admin_id: admin.id,
                    target_id: targetUser.id,
                    ban_status: isBanning ? 1 : 0
                });
                showAlert('สำเร็จ', `${actionText}ผู้ใช้เรียบร้อยแล้ว`);
                fetchUsers();
                if (userDetail) fetchUserDetail(targetUser.id);
            }
        );
    };

    const handleDeleteUser = (targetUser) => {
        confirmAction(
            '⚠️ ลบบัญชีถาวร',
            `คุณแน่ใจหรือไม่? บัญชี "${targetUser.username}" และข้อมูลทั้งหมดจะถูกลบถาวรและกู้คืนไม่ได้!`,
            async () => {
                await axios.post(`${API}/admin.php`, {
                    action: 'delete_user',
                    admin_id: admin.id,
                    target_id: targetUser.id
                });
                showAlert('สำเร็จ', 'ลบบัญชีเรียบร้อยแล้ว');
                setSelectedUser(null);
                setUserDetail(null);
                fetchUsers();
            }
        );
    };

    const handleSaveEdit = () => {
        confirmAction('บันทึกการแก้ไข', 'ยืนยันการแก้ไขข้อมูลผู้ใช้นี้?', async () => {
            await axios.post(`${API}/admin.php`, {
                action: 'edit_user',
                admin_id: admin.id,
                target_id: selectedUser.id,
                ...editForm
            });
            showAlert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย');
            fetchUsers();
            fetchUserDetail(selectedUser.id);
        });
    };

    const handleUpdateTicket = (ticket, status) => {
        const labels = { resolved: 'แก้ไขแล้ว', rejected: 'ปฏิเสธ', in_progress: 'กำลังดำเนินการ' };
        confirmAction('อัปเดตคำร้อง', `เปลี่ยนสถานะเป็น "${labels[status]}" ใช่หรือไม่?`, async () => {
            await axios.post(`${API}/admin.php`, {
                action: 'update_ticket',
                admin_id: admin.id,
                ticket_id: ticket.id,
                status
            });
            fetchTickets();
            setSelectedTicket(null);
        });
    };

    //  Modal helpers
    const showAlert = (title, message) => setModal({ show: true, type: 'alert', title, message, onConfirm: () => setModal(m => ({ ...m, show: false })) });
    const confirmAction = (title, message, action) => setModal({ show: true, type: 'confirm', title, message, onConfirm: () => { action(); setModal(m => ({ ...m, show: false })); } });

    //  Badge helpers
    const getRoleBadge = (role) => {
        if (role === 'merchant') return <span className="badge" style={{background:'#6c5ce7'}}>🏪 ร้านค้า</span>;
        return <span className="badge bg-primary">🛒 ลูกค้า</span>;
    };

    const getTicketTypeBadge = (type) => {
        const map = { complaint: ['bg-warning text-dark', '📢 ร้องเรียน'], report: ['bg-danger', '🚨 รายงาน'], request: ['bg-info text-dark', '📝 คำขอ'] };
        const [cls, label] = map[type] || ['bg-secondary', type];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    const getTicketStatusBadge = (status) => {
        const map = { open: ['bg-danger', '🔴 รอดำเนินการ'], in_progress: ['bg-warning text-dark', '🟡 กำลังดำเนินการ'], resolved: ['bg-success', '✅ แก้ไขแล้ว'], rejected: ['bg-secondary', '⛔ ปฏิเสธ'] };
        const [cls, label] = map[status] || ['bg-secondary', status];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    const getLogActionBadge = (action) => {
        const map = {
            ban: ['bg-danger', '🔨 แบน'],
            unban: ['bg-success', '✅ ปลดแบน'],
            delete_user: ['bg-dark', '🗑️ ลบบัญชี'],
            edit_user: ['bg-primary', '✏️ แก้ไข'],
            resolve_ticket: ['bg-success', '✅ แก้ไขคำร้อง'],
            reject_ticket: ['bg-secondary', '⛔ ปฏิเสธคำร้อง'],
        };
        const [cls, label] = map[action] || ['bg-secondary', action];
        return <span className={`badge ${cls}`}>{label}</span>;
    };

    //  RENDER
    return (
        <div className="container mt-4 pb-5">

            {/*  Navbar  */}
            <div className="card shadow-sm p-3 mb-4 sticky-top" style={{ top: '10px', zIndex: 2000 }}>
                <div className="d-flex flex-wrap justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-danger text-white fw-bold" style={{ width: 44, height: 44, fontSize: '1.2rem' }}>
                            🛡️
                        </div>
                        <div>
                            <h4 className="mb-0 text-danger">Admin Panel</h4>
                            <small className="text-muted">{admin?.fullname}</small>
                        </div>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                        {[
                            { key: 'users', icon: '👥', label: 'ผู้ใช้' },
                            { key: 'tickets', icon: '📨', label: 'คำร้อง' },
                            { key: 'logs', icon: '📋', label: 'ประวัติ' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                className={`btn ${activeTab === tab.key ? 'btn-danger' : 'btn-outline-danger'}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => confirmAction('ออกจากระบบ', 'ยืนยันออกจากระบบ?', () => { localStorage.removeItem('user'); navigate('/'); })}
                        >
                            ออก
                        </button>
                    </div>
                </div>
            </div>

            {/* 
                TAB: ผู้ใช้
             */}
            {activeTab === 'users' && (
                <div className="row">
                    {/*  ฝั่งซ้าย: รายชื่อ  */}
                    <div className={`${selectedUser ? 'col-md-5' : 'col-12'} mb-3`}>
                        <div className="card p-3 shadow-sm">
                            <h5 className="mb-3 text-danger">👥 รายชื่อผู้ใช้ทั้งหมด</h5>

                            {/* Search - ลบ onKeyDown ออก */}
                            <div className="d-flex gap-2 mb-3">
                                <input
                                    className="form-control"
                                    placeholder="🔍 ค้นหาชื่อ, username, ชื่อร้าน..."
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                />
                                {/* ลบปุ่ม "ค้นหา" ออก */}
                            </div>

                            {/* Filter - เปลี่ยน onClick ให้ set state อย่างเดียว (useEffect จัดการ fetch เอง) */}
                            <div className="d-flex gap-2 mb-3">
                                {['all', 'customer', 'merchant'].map(r => (
                                    <button
                                        key={r}
                                        className={`btn btn-sm ${userRoleFilter === r ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        onClick={() => setUserRoleFilter(r)}
                                    >
                                        {{ all: '🌐 ทั้งหมด', customer: '🛒 ลูกค้า', merchant: '🏪 ร้านค้า' }[r]}
                                    </button>
                                ))}
                            </div>

                            {/* List */}
                            <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                {users.length === 0 && <div className="text-center text-muted py-4">ไม่พบผู้ใช้</div>}
                                {users.map(u => (
                                    <div
                                        key={u.id}
                                        className={`d-flex align-items-center p-2 mb-2 rounded border ${selectedUser?.id === u.id ? 'border-danger bg-soft-danger' : 'border-light bg-white'}`}
                                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                        onClick={() => {
                                            setSelectedUser(u);
                                            fetchUserDetail(u.id);
                                        }}
                                    >
                                        {/* Avatar */}
                                        <div className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0 text-white fw-bold"
                                            style={{
                                                width: 44, height: 44,
                                                background: u.is_banned ? '#636e72' : (u.role === 'merchant' ? '#6c5ce7' : '#0984e3'),
                                                fontSize: '1.1rem'
                                            }}>
                                            {u.role === 'merchant' ? '🏪' : '👤'}
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <div className="d-flex align-items-center gap-2">
                                                <strong className="text-truncate">{u.fullname}</strong>
                                                {u.is_banned == 1 && <span className="badge bg-danger">🔨 แบน</span>}
                                            </div>
                                            <small className="text-muted">
                                                @{u.username}
                                                {u.role === 'merchant' && u.shop_name && ` · ${u.shop_name}`}
                                            </small>
                                        </div>
                                        {getRoleBadge(u.role)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/*  ฝั่งขวา: รายละเอียด  */}
                    {selectedUser && (
                        <div className="col-md-7 mb-3">
                            <div className="card p-4 shadow-sm">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <h5 className="mb-0 text-danger">👤 รายละเอียดผู้ใช้</h5>
                                    <button className="btn-close" onClick={() => { setSelectedUser(null); setUserDetail(null); }} />
                                </div>

                                {!userDetail ? (
                                    <div className="text-center py-4 text-muted">กำลังโหลด...</div>
                                ) : (
                                    <div style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                                        {/*  Header  */}
                                        <div className="d-flex align-items-center mb-4 p-3 rounded" style={{ background: '#f8f9fa' }}>
                                            <div className="rounded-circle d-flex align-items-center justify-content-center me-3 text-white"
                                                style={{ width: 64, height: 64, background: userDetail.user.role === 'merchant' ? '#6c5ce7' : '#0984e3', fontSize: '1.8rem' }}>
                                                {userDetail.user.role === 'merchant' ? '🏪' : '👤'}
                                            </div>
                                            <div>
                                                <h4 className="mb-1">{userDetail.user.fullname}</h4>
                                                <div className="d-flex gap-2 flex-wrap">
                                                    <span className="text-muted">@{userDetail.user.username}</span>
                                                    {getRoleBadge(userDetail.user.role)}
                                                    {userDetail.user.is_banned == 1 && <span className="badge bg-danger">🔨 ถูกแบน</span>}
                                                </div>
                                                <small className="text-muted">สมัครเมื่อ: {userDetail.user.created_at}</small>
                                            </div>
                                        </div>

                                        {/*  Edit Form  */}
                                        <div className="mb-4">
                                            <h6 className="fw-bold mb-3">✏️ แก้ไขข้อมูล</h6>
                                            <div className="row">
                                                <div className="col-md-6 mb-2">
                                                    <label className="small text-muted">ชื่อ-นามสกุล</label>
                                                    <input className="form-control" value={editForm.fullname} onChange={e => setEditForm({ ...editForm, fullname: e.target.value })} />
                                                </div>
                                                <div className="col-md-6 mb-2">
                                                    <label className="small text-muted">เบอร์โทร</label>
                                                    <input className="form-control" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                                                </div>
                                                {userDetail.user.role === 'merchant' && <>
                                                    <div className="col-md-6 mb-2">
                                                        <label className="small text-muted">ชื่อร้าน</label>
                                                        <input className="form-control" value={editForm.shop_name} onChange={e => setEditForm({ ...editForm, shop_name: e.target.value })} />
                                                    </div>
                                                    <div className="col-md-6 mb-2">
                                                        <label className="small text-muted">คำอธิบายร้าน</label>
                                                        <input className="form-control" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                                                    </div>
                                                </>}
                                            </div>

                                            {/* ปุ่มบันทึก + แบน/ลบ อยู่ด้วยกัน */}
                                            <div className="d-flex gap-2 flex-wrap mt-3">
                                                <button className="btn btn-primary" onClick={handleSaveEdit}>
                                                    💾 บันทึกการแก้ไข
                                                </button>
                                                <button
                                                    className={`btn ${userDetail.user.is_banned == 1 ? 'btn-success' : 'btn-warning'}`}
                                                    onClick={() => handleToggleBan(userDetail.user)}
                                                >
                                                    {userDetail.user.is_banned == 1 ? '✅ ปลดแบน' : '🔨 แบนผู้ใช้'}
                                                </button>
                                                <button
                                                    className="btn btn-danger"
                                                    onClick={() => handleDeleteUser(userDetail.user)}
                                                >
                                                    🗑️ ลบบัญชีถาวร
                                                </button>
                                            </div>
                                        </div>

                                        {/*  Addresses (ถ้า customer)  */}
                                        {userDetail.addresses.length > 0 && (
                                            <div className="mb-4">
                                                <h6 className="fw-bold mb-2">📍 ที่อยู่จัดส่ง ({userDetail.addresses.length} รายการ)</h6>
                                                {userDetail.addresses.map((addr, i) => (
                                                    <div key={i} className="bg-light p-2 rounded mb-1 small">
                                                        <strong>{addr.address_text}</strong> · {addr.contact_phone}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/*  Products (ถ้า merchant)  */}
                                        {userDetail.products.length > 0 && (
                                            <div className="mb-4">
                                                <h6 className="fw-bold mb-2">🍽️ เมนูอาหาร ({userDetail.products.length} รายการ)</h6>
                                                <div className="d-flex flex-wrap gap-2">
                                                    {userDetail.products.map((p, i) => (
                                                        <div key={i} className="badge bg-light text-dark border px-2 py-1">
                                                            {p.name} · {parseInt(p.price).toLocaleString()} บ.
                                                            {p.is_available == 0 && <span className="ms-1 text-danger">(ปิด)</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/*  Orders  */}
                                        {userDetail.orders !== undefined && (
                                            <div className="mb-4">
                                                <h6 className="fw-bold mb-2">
                                                    📜 ประวัติออเดอร์ทั้งหมด ({userDetail.orders.length} รายการ)
                                                </h6>

                                                {/* Search + Filter */}
                                                <div className="d-flex gap-2 mb-2">
                                                    <input
                                                        className="form-control form-control-sm"
                                                        placeholder="🔍 ค้นหาชื่อร้าน / ชื่อลูกค้า..."
                                                        value={orderSearch}
                                                        onChange={e => setOrderSearch(e.target.value)}
                                                    />
                                                </div>
                                                <div className="d-flex gap-1 mb-3 flex-wrap">
                                                    {['all', 'pending', 'accepted', 'cooking', 'delivering', 'completed', 'cancelled'].map(s => (
                                                        <button
                                                            key={s}
                                                            className={`btn btn-sm ${orderStatusFilter === s ? 'btn-danger' : 'btn-outline-secondary'}`}
                                                            style={{fontSize: '0.75rem', padding: '2px 8px'}}
                                                            onClick={() => setOrderStatusFilter(s)}
                                                        >
                                                            {{
                                                                all: 'ทั้งหมด',
                                                                pending: 'รอรับ',
                                                                accepted: 'รับแล้ว',
                                                                cooking: 'ปรุง',
                                                                delivering: 'ส่ง',
                                                                completed: '✅ สำเร็จ',
                                                                cancelled: '❌ ยกเลิก'
                                                            }[s]}
                                                        </button>
                                                    ))}
                                                </div>

                                                {userDetail.orders.length === 0 ? (
                                                    <div className="text-center text-muted small py-3">ไม่พบออเดอร์</div>
                                                ) : (
                                                    <table className="table table-sm table-hover align-middle" style={{fontSize: '0.85rem'}}>
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>#</th>
                                                                <th>วันที่/เวลา</th>
                                                                <th>{userDetail.user.role === 'merchant' ? 'ลูกค้า' : 'ร้านค้า'}</th>
                                                                <th>ราคา</th>
                                                                <th>สถานะ</th>
                                                                <th>เพิ่มเติม</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {userDetail.orders.map((o, i) => (
                                                                <OrderRow key={i} order={o} role={userDetail.user.role} />
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        )}

                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/*คำร้อง*/}
            {activeTab === 'tickets' && (
                <div className="row">
                    {/*  รายการคำร้อง  */}
                    <div className={`${selectedTicket ? 'col-md-5' : 'col-12'} mb-3`}>
                        <div className="card p-3 shadow-sm">
                            <h5 className="mb-3 text-danger">📨 คำร้องทั้งหมด</h5>

                            <div className="d-flex gap-2 mb-3">
                                <input
                                    className="form-control"
                                    placeholder="🔍 ค้นหาหัวข้อ, ชื่อผู้ส่ง..."
                                    value={ticketSearch}
                                    onChange={e => setTicketSearch(e.target.value)}
                                />
                            </div>

                            <div className="d-flex gap-2 mb-3 flex-wrap">
                                {['all', 'open', 'in_progress', 'resolved', 'rejected'].map(s => (
                                    <button
                                        key={s}
                                        className={`btn btn-sm ${ticketStatusFilter === s ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        onClick={() => setTicketStatusFilter(s)}
                                    >
                                        {{ all: 'ทั้งหมด', open: '🔴 รอ', in_progress: '🟡 กำลังดำเนินการ', resolved: '✅ แก้ไขแล้ว', rejected: '⛔ ปฏิเสธ' }[s]}
                                    </button>
                                ))}
                            </div>

                            <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                                {tickets.length === 0 && <div className="text-center text-muted py-4">ไม่มีคำร้อง</div>}
                                {tickets.map(t => (
                                    <div
                                        key={t.id}
                                        className={`p-3 mb-2 rounded border ${selectedTicket?.id === t.id ? 'border-danger bg-soft-danger' : 'border-light bg-white'}`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => setSelectedTicket(t)}
                                    >
                                        <div className="d-flex justify-content-between mb-1">
                                            <strong className="text-truncate me-2">{t.subject}</strong>
                                            {getTicketTypeBadge(t.type)}
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <small className="text-muted">
                                                จาก: {t.sender_fullname} (@{t.sender_username})
                                                {t.target_username && ` → @${t.target_username}`}
                                            </small>
                                            {getTicketStatusBadge(t.status)}
                                        </div>
                                        <small className="text-muted">{t.created_at}</small>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/*  รายละเอียดคำร้อง  */}
                    {selectedTicket && (
                        <div className="col-md-7 mb-3">
                            <div className="card p-4 shadow-sm">
                                <div className="d-flex justify-content-between mb-3">
                                    <h5 className="mb-0 text-danger">📄 รายละเอียดคำร้อง #{selectedTicket.id}</h5>
                                    <button className="btn-close" onClick={() => setSelectedTicket(null)} />
                                </div>

                                <div className="bg-light p-3 rounded mb-3">
                                    <div className="d-flex gap-2 mb-2 flex-wrap">
                                        {getTicketTypeBadge(selectedTicket.type)}
                                        {getTicketStatusBadge(selectedTicket.status)}
                                    </div>
                                    <h5>{selectedTicket.subject}</h5>
                                    <p className="text-muted mb-0">{selectedTicket.message}</p>
                                    <hr />
                                    <div className="row small">
                                        <div className="col-6">
                                            <strong>ผู้ส่งคำร้อง:</strong><br />
                                            <span>{selectedTicket.sender_fullname}</span><br />
                                            <span className="text-muted">@{selectedTicket.sender_username} · {selectedTicket.sender_role}</span><br />
                                            <button
                                                className="btn btn-sm btn-outline-primary mt-1"
                                                onClick={() => {
                                                    setActiveTab('users');
                                                    // หา user ในลิสต์แล้วกดเข้าไปดู
                                                    const found = users.find(u => u.username === selectedTicket.sender_username);
                                                    if (found) { setSelectedUser(found); fetchUserDetail(found.id); }
                                                }}
                                            >
                                                ดูโปรไฟล์
                                            </button>
                                        </div>
                                        {selectedTicket.target_username && (
                                            <div className="col-6">
                                                <strong>ผู้ถูกรายงาน:</strong><br />
                                                <span>{selectedTicket.target_fullname}</span><br />
                                                <span className="text-muted">@{selectedTicket.target_username}</span><br />
                                                <button
                                                    className="btn btn-sm btn-outline-danger mt-1"
                                                    onClick={() => {
                                                        setActiveTab('users');
                                                        const found = users.find(u => u.username === selectedTicket.target_username);
                                                        if (found) { setSelectedUser(found); fetchUserDetail(found.id); }
                                                    }}
                                                >
                                                    ดูโปรไฟล์
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons สำหรับ Ticket */}
                                {selectedTicket.status === 'open' || selectedTicket.status === 'in_progress' ? (
                                    <div className="d-flex gap-2 flex-wrap">
                                        <button className="btn btn-warning flex-fill" onClick={() => handleUpdateTicket(selectedTicket, 'in_progress')}>🟡 กำลังดำเนินการ</button>
                                        <button className="btn btn-success flex-fill" onClick={() => handleUpdateTicket(selectedTicket, 'resolved')}>✅ แก้ไขแล้ว</button>
                                        <button className="btn btn-secondary flex-fill" onClick={() => handleUpdateTicket(selectedTicket, 'rejected')}>⛔ ปฏิเสธ</button>
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary mb-0">คำร้องนี้ถูกดำเนินการแล้ว</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 
                TAB: ประวัติ (Admin Logs)
             */}
            {activeTab === 'logs' && (
                <div className="card shadow-sm p-4">
                    <h5 className="mb-4 text-danger">📋 ประวัติการดำเนินการของ Admin</h5>
                    {/* ← เพิ่มส่วนนี้ */}
                    <div className="d-flex gap-2 mb-3">
                        <input
                            className="form-control"
                            placeholder="🔍 ค้นหาชื่อ Admin, ชื่อเป้าหมาย, รายละเอียด..."
                            value={logSearch}
                            onChange={e => setLogSearch(e.target.value)}
                        />
                    </div>
                    <div className="d-flex gap-2 mb-4 flex-wrap">
                        {['all', 'ban', 'unban', 'delete_user', 'edit_user', 'resolve_ticket', 'reject_ticket'].map(a => (
                            <button
                                key={a}
                                className={`btn btn-sm ${logActionFilter === a ? 'btn-danger' : 'btn-outline-secondary'}`}
                                onClick={() => setLogActionFilter(a)}
                            >
                                {{
                                    all: '🌐 ทั้งหมด',
                                    ban: '🔨 แบน',
                                    unban: '✅ ปลดแบน',
                                    delete_user: '🗑️ ลบบัญชี',
                                    edit_user: '✏️ แก้ไข',
                                    resolve_ticket: '✅ แก้ไขคำร้อง',
                                    reject_ticket: '⛔ ปฏิเสธคำร้อง'
                                }[a]}
                            </button>
                        ))}
                    </div>
                    {/* ← จบส่วนที่เพิ่ม */}
                    {logs.length === 0 ? (
                        <div className="text-center text-muted py-5">ยังไม่มีประวัติ</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>วันที่ / เวลา</th>
                                        <th>Admin</th>
                                        <th>การกระทำ</th>
                                        <th>เป้าหมาย</th>
                                        <th>รายละเอียด</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id}>
                                            <td className="text-muted small">#{log.id}</td>
                                            <td>
                                                <div className="small">{log.created_at.split(' ')[0]}</div>
                                                <div className="text-muted small">{log.created_at.split(' ')[1]?.substring(0, 5)}</div>
                                            </td>
                                            <td>
                                                <strong>{log.admin_fullname}</strong><br />
                                                <small className="text-muted">@{log.admin_username}</small>
                                            </td>
                                            <td>{getLogActionBadge(log.action)}</td>
                                            <td>
                                                {log.target_username ? (
                                                    <span>{log.target_fullname}<br /><small className="text-muted">@{log.target_username}</small></span>
                                                ) : (
                                                    <span className="text-muted small">-</span>
                                                )}
                                            </td>
                                            <td><small className="text-muted">{log.detail}</small></td>
                                            <td>
                                                {/* ปุ่มปลดแบนจากหน้าประวัติได้เลย ถ้า action เป็น ban */}
                                                {log.action === 'ban' && log.target_user_id && (
                                                    <button
                                                        className="btn btn-sm btn-outline-success"
                                                        onClick={() => {
                                                            const fakeUser = { id: log.target_user_id, fullname: log.target_fullname, username: log.target_username, is_banned: 1 };
                                                            handleToggleBan(fakeUser);
                                                        }}
                                                    >
                                                        ✅ ปลดแบน
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/*  Modal  */}
            {modal.show && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h4 className="mb-3">{modal.title}</h4>
                        <p className="text-muted mb-4">{modal.message}</p>
                        <div className="d-flex justify-content-center gap-2">
                            {modal.type === 'confirm' && (
                                <button className="btn btn-secondary flex-fill" onClick={() => setModal(m => ({ ...m, show: false }))}>ยกเลิก</button>
                            )}
                            <button className="btn btn-danger flex-fill" onClick={modal.onConfirm}>ตกลง</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Admin;