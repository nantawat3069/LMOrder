import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Customer() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    
    // UI States
    const [activeTab, setActiveTab] = useState('shops'); // shops, orders, settings
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    
    // Data States
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [activeOrdersCount, setActiveOrdersCount] = useState(0);

    // Notification & Order Detail Modal
    
    const [viewingOrder, setViewingOrder] = useState(null);   // เก็บออเดอร์ที่กำลังกดดูรายละเอียด (Popup)

    // เก็บที่อยู่ที่บันทึกไว้เพื่อใช้ใน Dropdown
    const [savedAddresses, setSavedAddresses] = useState([]);

    // เพิ่มบรรทัดนี้ State สำหรับเปิด/ปิด ตะกร้าในมือถือ
    const [showMobileCart, setShowMobileCart] = useState(false);

    // Profile & Settings States
    const [profileForm, setProfileForm] = useState({
        fullname: '',
        username: '', 
        password: '',
        phone: '',
        addresses: [] 
    });
    const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');

    // Modal States
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentOptions, setCurrentOptions] = useState({});
    const [note, setNote] = useState('');

    // Cart States
    const [address, setAddress] = useState(''); 
    const [paymentMethod, setPaymentMethod] = useState('เงินสด ปลายทาง');
    const [selectedAddressId, setSelectedAddressId] = useState(''); 

    // ชำระธนาคาร
    const [showPaymentPopup, setShowPaymentPopup] = useState(false);
    const [slipFile, setSlipFile] = useState(null);
    const [slipPreview, setSlipPreview] = useState('');

    // General Modal System
    const [modal, setModal] = useState({ show: false, type: 'alert', title: '', message: '', onConfirm: null });

    // Report & Ban States
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportForm, setReportForm] = useState({ category: '', message: '' });
    const [isBanned, setIsBanned] = useState(false);
    const [banInfo, setBanInfo] = useState({ reason: null, message: null });
    const [banAppealMessage, setBanAppealMessage] = useState('');
    const [appealStatus, setAppealStatus] = useState(null);
    const [appealTicketId, setAppealTicketId] = useState(null);

    // Notifications
    const [myNotifications, setMyNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const [newNotifIds, setNewNotifIds] = useState(new Set());

    // เก็บ URL สลิป
    const [viewingSlip, setViewingSlip] = useState(null);

    const fetchMyNotifications = async (uid) => {
        try {
            const res = await axios.get(`https://lmorder-production.up.railway.app/admin.php?action=get_my_notifications&user_id=${uid}`);
            if (res.data.status === 'success') {
                // ตรวจจับ notification ใหม่ที่ยังไม่เคยเห็น
                setMyNotifications(prev => {
                    const prevIds = new Set(prev.map(n => n.id));
                    const incoming = res.data.notifications;
                    const brandNew = incoming.filter(n => !prevIds.has(n.id) && n.is_read == '0');
                    
                    if (brandNew.length > 0) {
                        const newIds = new Set(brandNew.map(n => n.id));
                        setNewNotifIds(prev => new Set([...prev, ...newIds]));
                        // ลบออกหลัง 5 วิ
                        setTimeout(() => {
                            setNewNotifIds(prev => {
                                const updated = new Set(prev);
                                newIds.forEach(id => updated.delete(id));
                                return updated;
                            });
                        }, 5000);
                    }
                    return incoming;
                });
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

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) { navigate('/'); return; }
        const u = JSON.parse(storedUser);
        setUser(u);

        if (u.is_banned == 1) {
            setIsBanned(true);
            setBanInfo({ reason: u.ban_reason || 'ไม่ระบุ', message: u.ban_message || null });
            fetchAppealStatus(u.id, u.banned_at);
        }

        fetchShops();
        fetchMyOrders(u.id);
        fetchAddresses(u.id);
        fetchMyNotifications(u.id);

        // Real-time ทุก 5 วิ
        const globalInterval = setInterval(() => {
            fetchMyOrders(u.id);
            fetchShops();
            fetchMyNotifications(u.id);
        }, 5000);

        return () => clearInterval(globalInterval);
    }, []);

    useEffect(() => {
        let menuInterval;
        if (selectedShop) {
            menuInterval = setInterval(() => {
                updateMenuData(selectedShop.id);
            }, 3000);
        }
        return () => clearInterval(menuInterval);
    }, [selectedShop]);

    useEffect(() => {
        if (activeTab === 'settings' && user) {
            fetchProfileData();
        }
    }, [activeTab]);

    // Real-time Check 1: ถ้าร้านปิดขณะเลือกอยู่ -> ให้เด้งออกทันที
    useEffect(() => {
        if (selectedShop && shops.length > 0) {
            const currentShop = shops.find(s => s.id === selectedShop.id);
            // ถ้าร้านหาไม่เจอ (อาจจะโดนลบ) หรือ สถานะเปลี่ยนเป็นปิด (0)
            if (currentShop && currentShop.is_open == 0) {
                setSelectedShop(null); // เด้งออกจากหน้าร้าน กลับไปหน้ารวม
                showAlert('ร้านปิดให้บริการ', '⚠️ ขออภัย ร้านค้านี้เพิ่งปิดให้บริการชั่วคราวครับ');
            }
        }
    }, [shops, selectedShop]); // ทำงานทุกครั้งที่รายชื่อร้านอัปเดต (ทุก 3 วิ)

    // Real-time Check 2 ถ้ากำลังเลือกเมนูอยู่ แล้วของหมด -> ปิด Popup เมนูทันที
    useEffect(() => {
        if (selectedProduct && products.length > 0) {
            const currentProduct = products.find(p => p.id === selectedProduct.id);
            // ถ้าสินค้าหาไม่เจอ หรือ สถานะเปลี่ยนเป็นหมด (0)
            if (currentProduct && currentProduct.is_available == 0) {
                setSelectedProduct(null); // ปิด Modal เลือกเมนู
                showAlert('สินค้าหมด', '⚠️ ขออภัย สินค้ารายการนี้เพิ่งหมดหรือปิดรับชั่วคราวครับ');
            }
        }
    }, [products, selectedProduct]); // ทำงานทุกครั้งที่รายการสินค้าอัปเดต (ทุก 3 วิ)

    // useEffect check_ban
    useEffect(() => {
        if (!user) return;

        // เช็คครั้งแรกทันที
        const checkBan = async () => {
            try {
                const res = await axios.get(`https://lmorder-production.up.railway.app/customer.php?action=check_ban&user_id=${user.id}`);
                if (res.data.is_banned == 1) {
                    setIsBanned(true);
                    // อัปเดตทุกครั้งเลย ไม่ต้องเช็คก่อน
                    setBanInfo({ 
                        reason: res.data.ban_reason || 'ไม่ระบุ', 
                        message: res.data.ban_message || null 
                    });
                    fetchAppealStatus(user.id, res.data.banned_at); // ส่ง banned_at ไปด้วย
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

    // ...

    const showAlert = (title, message) => setModal({ show: true, type: 'alert', title, message, onConfirm: () => setModal({ ...modal, show: false }) });
    const confirmAction = (title, message, action) => setModal({ show: true, type: 'confirm', title, message, onConfirm: () => { action(); setModal({ ...modal, show: false }); } });
    const closeModal = () => setModal({ ...modal, show: false });

    //  API Functions 
    const fetchShops = async () => {
        try {
            const res = await axios.get('https://lmorder-production.up.railway.app/customer.php?action=get_shops');
            if (res.data.status === 'success') {
                const sortedShops = res.data.shops.sort((a, b) => b.is_open - a.is_open);
                setShops(sortedShops);
            }
        } catch (err) { console.error(err); }
    };

    const fetchShopMenu = async (shop) => {
        setSelectedShop(shop);
        setCart([]); 
        updateMenuData(shop.id);
        setSelectedAddressId('');
        setAddress('');
    };

    const updateMenuData = async (shopId) => {
        try {
            const res = await axios.get(`https://lmorder-production.up.railway.app/order.php?action=get_shop_menu&shop_id=${shopId}`);
            if (res.data.status === 'success') setProducts(res.data.products);
        } catch (err) { console.error(err); }
    };

    const fetchMyOrders = async (cid) => {
        try {
            const res = await axios.get(`https://lmorder-production.up.railway.app/order.php?action=get_my_orders&customer_id=${cid}`);
            if (res.data.status === 'success') {
                setMyOrders(res.data.orders);
                setActiveOrdersCount(res.data.orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length);
            }
        } catch (err) { console.error(err); }
    };

    const fetchAddresses = async (uid) => {
        try {
            const res = await axios.get(`https://lmorder-production.up.railway.app/customer.php?action=get_profile&user_id=${uid}`);
            if (res.data.status === 'success') {
                setSavedAddresses(res.data.addresses);
            }
        } catch (err) { console.error(err); }
    };

    const fetchProfileData = async () => {
        try {
            const res = await axios.get(`https://lmorder-production.up.railway.app/customer.php?action=get_profile&user_id=${user.id}`);
            if (res.data.status === 'success') {
                const u = res.data.user;
                setProfileForm({
                    fullname: u.fullname,
                    username: u.username,
                    password: '',
                    phone: u.phone,
                    addresses: res.data.addresses.length > 0 ? res.data.addresses : [{ address_text: '', contact_phone: u.phone }]
                });
                setSavedAddresses(res.data.addresses);
            }
        } catch (err) { console.error(err); }
    };

    //  Profile Logic 
    const handleAddAddress = () => {
        setProfileForm({
            ...profileForm,
            addresses: [...profileForm.addresses, { address_text: '', contact_phone: '' }]
        });
    };

    const handleAddressChange = (index, field, value) => {
        const newAddresses = [...profileForm.addresses];
        newAddresses[index][field] = value;
        setProfileForm({ ...profileForm, addresses: newAddresses });
    };

    const handleRemoveAddress = (index) => {
        confirmAction('ลบที่อยู่', 'คุณต้องการลบที่อยู่นี้ใช่หรือไม่?', () => {
            const newAddresses = profileForm.addresses.filter((_, i) => i !== index);
            setProfileForm({ ...profileForm, addresses: newAddresses });
        });
    };

    const handleSaveProfile = async () => {
        confirmAction('บันทึกการตั้งค่า', 'ต้องการยืนยันการแก้ไขข้อมูลหรือไม่?', async () => {
            try {
                await axios.post('https://lmorder-production.up.railway.app/customer.php', {
                    action: 'update_profile',
                    user_id: user.id,
                    fullname: profileForm.fullname,
                    phone: profileForm.phone,
                    password: profileForm.password,
                    addresses: profileForm.addresses
                });
                const updatedUser = { ...user, fullname: profileForm.fullname };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                showAlert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว');
                setProfileForm({ ...profileForm, password: '' });
                fetchAddresses(user.id);
            } catch (err) { showAlert('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้'); }
        });
    };

    const handleDeleteAccount = () => {
        if (deleteConfirmUsername !== profileForm.username) {
            showAlert('ผิดพลาด', 'ชื่อผู้ใช้งาน (Username) ไม่ตรงกัน'); return;
        }
        confirmAction('ลบบัญชีถาวร', '⚠️ ยืนยันที่จะลบหรือไม่?', async () => {
            const res = await axios.post('https://lmorder-production.up.railway.app/customer.php', {
                action: 'delete_account',
                user_id: user.id,
                username_confirmation: deleteConfirmUsername
            });
            if (res.data.status === 'success') {
                localStorage.removeItem('user');
                navigate('/');
            } else { showAlert('ผิดพลาด', res.data.message); }
        });
    };

    //  Cart & Checkout Logic 
    const handleSelectProduct = (product) => {
        if(product.is_available == 0) return;
        setSelectedProduct(product);
        setCurrentOptions({});
        setNote('');
    };

    const handleOptionChange = (groupIndex, groupType, choice, isChecked) => {
        const newOptions = { ...currentOptions };
        if (groupType === 'radio') newOptions[groupIndex] = [choice];
        else {
            if (!newOptions[groupIndex]) newOptions[groupIndex] = [];
            if (isChecked) newOptions[groupIndex].push(choice);
            else newOptions[groupIndex] = newOptions[groupIndex].filter(c => c.name !== choice.name);
        }
        setCurrentOptions(newOptions);
    };

    const calculateCurrentPrice = () => {
        if (!selectedProduct) return 0;
        let total = parseInt(selectedProduct.price);
        Object.values(currentOptions).flat().forEach(opt => total += parseInt(opt.price || 0));
        return total;
    };

    const confirmAddToCart = () => {
        if (selectedProduct.options) {
            for (let i = 0; i < selectedProduct.options.length; i++) {
                const group = selectedProduct.options[i];
                if (group.type === 'radio' && (!currentOptions[i] || currentOptions[i].length === 0)) {
                    showAlert('แจ้งเตือน', `กรุณาเลือก "${group.name}"`); return;
                }
            }
        }
        const cartItem = {
            ...selectedProduct,
            unique_id: Date.now(),
            qty: 1,
            price: calculateCurrentPrice(),
            selected_options: Object.values(currentOptions).flat().map(opt => ({ group: opt.groupName, name: opt.name, price: opt.price })),
            special_instruction: note
        };
        setCart([...cart, cartItem]);
        setSelectedProduct(null);
    };

    const updateCartQty = (uid, newQty) => {
        if (newQty < 1) return;
        setCart(cart.map(item => item.unique_id === uid ? { ...item, qty: newQty } : item));
    };

    const removeFromCart = (uid) => setCart(cart.filter(item => item.unique_id !== uid));
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const handleSelectAddress = (e) => {
        const addrId = e.target.value;
        setSelectedAddressId(addrId);
        if (addrId) {
            const selected = savedAddresses.find(a => a.id == addrId);
            if (selected) setAddress(`${selected.address_text} (ติดต่อ: ${selected.contact_phone})`);
        } else {
            setAddress('');
        }
    };

    const handleAddAddressFromCart = () => {
        confirmAction('ยังไม่มีที่อยู่', 'คุณยังไม่ได้บันทึกที่อยู่จัดส่ง ต้องการไปหน้าตั้งค่าเพื่อเพิ่มที่อยู่หรือไม่?', () => {
            setActiveTab('settings');
        });
    };

    // ฟังก์ชันจริงที่ยิง API สั่งออเดอร์
    const doPlaceOrder = async (slipFileToUpload = null) => {
        try {
            const res = await axios.post('https://lmorder-production.up.railway.app/order.php', {
                action: 'place_order',
                customer_id: user.id,
                shop_id: selectedShop.id,
                total_price: totalPrice,
                address: address,
                payment_method: paymentMethod,
                items: cart
            });

            if (res.data.status === 'success') {
                // ถ้ามีสลิปให้ upload
                if (slipFileToUpload && res.data.order_id) {
                    const formData = new FormData();
                    formData.append('action', 'upload_slip');
                    formData.append('order_id', res.data.order_id);
                    formData.append('slip', slipFileToUpload);
                    await axios.post('https://lmorder-production.up.railway.app/order.php', formData);
                }

                showAlert('สำเร็จ', 'สั่งซื้อเรียบร้อย!');
                setSelectedShop(null);
                setActiveTab('orders');
                setSlipFile(null);
                setSlipPreview('');
                setShowMobileCart(false);
            }
        } catch (err) { showAlert('Error', 'เกิดข้อผิดพลาด'); }
    };

    // กดยืนยันสั่งซื้อปกติ (เงินสด / ธนาคารปลายทาง)
    const handlePlaceOrder = async () => {
        if (cart.length === 0) { showAlert('ตะกร้าว่าง', 'กรุณาเลือกสินค้าก่อนครับ'); return; }
        if (!selectedAddressId && !address) { showAlert('ข้อมูลไม่ครบ', 'กรุณาเลือกที่อยู่จัดส่งครับ'); return; }

        if (paymentMethod === 'ชำระทันที') {
            setSlipFile(null);
            setSlipPreview('');
            setShowPaymentPopup(true);
            return;
        }

        confirmAction('ยืนยันการสั่งซื้อ', `ยอดรวม ${totalPrice.toLocaleString()} บาท ยืนยันหรือไม่?`, () => doPlaceOrder(null));
    };

    // แก้ไข: ฟังก์ชันยกเลิกออเดอร์ แบบสลับหน้า Pop-up
    const handleCancelOrder = (order) => {
        // 1. ปิดหน้า Pop-up รายละเอียดก่อน เพื่อไม่ให้ทับกัน
        setViewingOrder(null);

        // 2. เปิดหน้า Pop-up ยืนยัน
        setModal({
            show: true,
            type: 'confirm',
            title: 'ยกเลิกออเดอร์',
            message: 'คุณต้องการยกเลิกออเดอร์นี้ใช่ไหม?',
            // กรณีตอบตกลง ลบจริง
            onConfirm: async () => {
                try {
                    await axios.post('https://lmorder-production.up.railway.app/order.php', {
                        action: 'update_status', 
                        order_id: order.id, 
                        status: 'cancelled' 
                    });
                    fetchMyOrders(user.id);
                    setModal(prev => ({ ...prev, show: false })); // ปิด Modal ยืนยัน
                    // ไม่ต้องเปิด viewingOrder กลับมา เพราะออเดอร์ถูกยกเลิกแล้ว
                } catch (err) { console.error(err); }
            },
            // กรณีตอบยกเลิก/กากบาท ให้สลับกลับไปหน้ารายละเอียด
            onCancel: () => {
                setModal(prev => ({ ...prev, show: false })); // ปิด Modal ยืนยัน
                setViewingOrder(order); // เปิด Modal รายละเอียดกลับขึ้นมาใหม่
            }
        });
    };

    // Helper ปิดแถบแจ้งเตือน แบบถาวร บันทึกลงฐานข้อมูล
    const handleCloseNotif = async (e, orderId) => {
        e.stopPropagation();
        try {
            // ยิง API ไปบอก Server ว่าปิดแจ้งเตือนออเดอร์นี้แล้วนะ
            await axios.post('https://lmorder-production.up.railway.app/order.php', {
                action: 'close_notification',
                order_id: orderId
            });
            // ดึงข้อมูลออเดอร์ใหม่ทันที เพื่อให้หน้าจออัปเดต
            fetchMyOrders(user.id);
        } catch (err) { console.error(err); }
    };

    // ส่งรายงานร้านค้า
    const handleSubmitReport = async () => {
        if (!reportForm.category) { showAlert('แจ้งเตือน', 'กรุณาเลือกหมวดหมู่การรายงาน'); return; }
        try {
            await axios.post('https://lmorder-production.up.railway.app/admin.php', {
                action: 'submit_ticket',
                sender_id: user.id,
                target_id: selectedShop?.id_owner ?? null,
                type: 'report',
                subject: `รายงานร้าน: ${selectedShop?.shop_name} — ${reportForm.category}`,
                message: reportForm.message || '(ไม่มีข้อความเพิ่มเติม)'
            });
            setShowReportModal(false);
            setReportForm({ category: '', message: '' });
            
            await axios.post('https://lmorder-production.up.railway.app/admin.php', {
                action: 'send_notification',
                admin_id: user.id,
                user_id: user.id,
                category: 'รายงานร้านค้า',
                message: `ส่งรายงานร้าน "${selectedShop?.shop_name}" หมวด: ${reportForm.category} — รอแอดมินรับคำร้อง`
            });
            fetchMyNotifications(user.id);

            showAlert('ส่งรายงานแล้ว', 'ส่งรายงานถึงแอดมินเรียบร้อยแล้ว ขอบคุณครับ');
        } catch (err) { showAlert('ผิดพลาด', 'ไม่สามารถส่งรายงานได้'); }
    };

    // ดึงสถานะคำร้องอุทธรณ์ล่าสุดของ user
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

    // ส่งคำร้องขออุทธรณ์แบน
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
            await axios.post('https://lmorder-production.up.railway.app/admin.php', {
                action: 'send_notification',
                admin_id: user.id,
                user_id: user.id,
                category: 'ยื่นอุทธรณ์',
                message: `ส่งคำร้องอุทธรณ์การแบนแล้ว — รอแอดมินรับคำร้อง`
            });
            fetchMyNotifications(user.id)
            fetchAppealStatus(user.id);
        } catch (err) { console.error(err); }
    };

    // เช็คว่าร้านมีข้อมูลธนาคารครบไหม
    const shopHasBank = () => {
        return selectedShop?.bank_name && selectedShop?.bank_account && selectedShop?.bank_account_name;
    };

    // เช็คว่าร้านมี QR ไหม
    const shopHasQR = () => !!selectedShop?.qr_code;

    // Dropdown options ตามข้อมูลร้าน
    const getPaymentOptions = () => {
        const opts = ['เงินสด ปลายทาง'];
        if (shopHasBank() || shopHasQR()) opts.push('ธนาคาร/QR-code ปลายทาง');
        if (shopHasBank() || shopHasQR()) opts.push('ชำระทันที');
        return opts;
    };

    // กดส่งสลิปจาก Popup ชำระทันที
    const handleSubmitSlip = async () => {
        if (!slipFile) { showAlert('แจ้งเตือน', 'กรุณาเลือกรูปสลิปก่อนครับ'); return; }
        setShowPaymentPopup(false);
        await doPlaceOrder(slipFile);
    };

    const getStatusBadge = (status) => {
        switch(status) {
            case 'pending': return <span className="badge bg-secondary">รอร้านรับ</span>;
            case 'accepted': return <span className="badge bg-primary">รับออเดอร์แล้ว</span>;
            case 'cooking': return <span className="badge bg-warning text-dark">กำลังปรุง</span>;
            case 'delivering': return <span className="badge bg-info text-white">กำลังส่ง</span>;
            case 'completed': return <span className="badge bg-success">สำเร็จ</span>;
            case 'cancelled': return <span className="badge bg-danger">ยกเลิก</span>;
            default: return status;
        }
    };

    // Helper: กรองออเดอร์ที่จะแสดงในแถบแจ้งเตือน
    const activeNotifications = myOrders.filter(o => {
        const isFinished = ['completed', 'cancelled'].includes(o.status);
        if (!isFinished) return true; // ถ้ายังไม่เสร็จ ให้โชว์ตลอด
        // ถ้าเสร็จแล้ว ให้โชว์เฉพาะที่ database บอกว่ายังไม่ได้ปิด (0)
        return o.is_closed_notif == 0; 
    });

    return (
        <div className="container mt-4 pb-5">
            {/* Navbar */}
            {/* แก้ไข: เติม d-none d-md-block เพื่อซ่อนในมือถือ (แสดงเฉพาะในคอม) */}
            <div className="card shadow-sm p-3 mb-4 sticky-top d-none d-md-block" style={{top: '10px', zIndex: 2000}}>
                <div className="d-flex flex-wrap justify-content-between align-items-center">
                    <h3 className="mb-0 text-primary d-flex align-items-center gap-2">
                        <span className="material-icons" style={{ fontSize: '28px' }}>waving_hand</span> 
                        สวัสดีคุณ {user?.fullname}
                    </h3>
                    <div className="d-flex gap-2">
                        <button className={`btn d-inline-flex align-items-center gap-1 ${activeTab === 'shops' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setActiveTab('shops')}>
                            <span className="material-icons" style={{fontSize: '18px'}}>storefront</span> ร้านค้า
                        </button>
                        <button className={`btn position-relative d-inline-flex align-items-center gap-1 ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setActiveTab('orders')}>
                            <span className="material-icons" style={{fontSize: '18px'}}>receipt_long</span> ประวัติ
                            {activeOrdersCount > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{activeOrdersCount}</span>}
                        </button>
                        <button
                            className={`btn position-relative d-inline-flex align-items-center gap-1 ${activeTab === 'notifications' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { setActiveTab('notifications'); markNotificationsRead(); }}
                        >
                            <span className="material-icons" style={{fontSize: '18px'}}>notifications</span> แจ้งเตือน
                            {unreadCount > 0 && (
                                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        <button className={`btn d-inline-flex align-items-center gap-1 ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setActiveTab('settings')}>
                            <span className="material-icons" style={{fontSize: '18px'}}>settings</span> ตั้งค่าบัญชี
                        </button>
                        <button className="btn btn-outline-danger d-inline-flex align-items-center gap-1" onClick={() => confirmAction('ออกจากระบบ', 'ยืนยัน?', () => { localStorage.removeItem('user'); navigate('/'); })}>
                            <span className="material-icons" style={{fontSize: '18px'}}>logout</span> ออก
                        </button>
                    </div>
                </div>
            </div>
            {/* เพิ่มใหม่: Mobile Header (แสดงชื่อลูกค้าแบบเรียบๆ เฉพาะมือถือ) */}
            <div className="d-block d-md-none mb-3 pt-2">
                <h3 className="mb-0 text-primary fw-bold">👋 สวัสดีคุณ {user?.fullname}</h3>
            </div>

            {/* แถบแจ้งเตือนสถานะออเดอร์ (Status Bar) */}
            {activeNotifications.length > 0 && (
                <div className="mb-4">
                    {activeNotifications.map(o => (
                        <div key={o.id} className="card shadow-sm border-0 mb-2 p-2 px-3 fade-in d-flex flex-row align-items-center justify-content-between bg-white">
                            <div className="d-flex align-items-center flex-grow-1" style={{overflow: 'hidden'}}>
                                {/* รูป + ชื่อร้าน */}
                                <div className="d-flex align-items-center me-3" style={{minWidth: '150px'}}>
                                    {o.shop_image ? 
                                        <img src={`${o.shop_image}`} className="rounded-circle me-2 border" style={{width: '40px', height: '40px', objectFit: 'cover'}} /> 
                                        : <div className="bg-light rounded-circle me-2 d-flex align-items-center justify-content-center border" style={{width: '40px', height: '40px'}}>🏪</div>
                                    }
                                    <strong className="text-truncate" style={{maxWidth: '100px'}}>{o.shop_name}</strong>
                                </div>

                                {/* รายละเอียดแบบย่อ (ซ่อนบางส่วนในมือถือได้ถ้าต้องการ) */}
                                <div className="d-flex align-items-center gap-3 text-muted small flex-wrap">
                                    <span>#{o.id}</span>
                                    <span className="d-none d-md-inline">🕒 {o.order_time.split(' ')[1].substring(0,5)}</span>
                                    <span className="fw-bold text-primary">{parseInt(o.total_price).toLocaleString()} บ.</span>
                                    <span>{getStatusBadge(o.status)}</span>
                                    
                                    {/* ปุ่มเพิ่มเติม */}
                                    <button className="btn btn-sm btn-link text-decoration-none p-0" onClick={() => setViewingOrder(o)}>
                                        [เพิ่มเติม]
                                    </button>
                                </div>
                            </div>

                            {/* ปุ่มปิด (X) เฉพาะออเดอร์ที่จบแล้ว */}
                            {['completed', 'cancelled'].includes(o.status) && (
                                <button className="btn btn-sm btn-close ms-2" onClick={(e) => handleCloseNotif(e, o.id)} title="ปิดแจ้งเตือน"></button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* TAB: Shops */}
            {activeTab === 'shops' && (
                <div className="p-4 bg-white rounded shadow-sm h-100">
                    {!selectedShop ? (
                        <div>
                            {shops.length === 0 ? <div className="text-center py-5">ไม่มีร้านเปิด</div> : (
                                <div className="row">
                                    {shops.map(shop => (
                                        <div key={shop.id} className="col-md-4 mb-4">
                                            <div 
                                                className={`card h-100 ${shop.is_open == 1 ? 'hover-card' : ''}`} 
                                                style={{
                                                    cursor: shop.is_open == 1 ? 'pointer' : 'not-allowed',
                                                    opacity: shop.is_open == 1 ? 1 : 0.7, 
                                                    backgroundColor: shop.is_open == 1 ? '#fff' : '#f8f9fa'
                                                }} 
                                                onClick={() => shop.is_open == 1 && fetchShopMenu(shop)}
                                            >
                                                <div className="card-body text-center p-4">
                                                    {shop.image ? (
                                                        <img src={shop.image} className="rounded-circle mb-3" style={{width:'80px', height:'80px', objectFit:'cover', filter: shop.is_open == 1 ? 'none' : 'grayscale(100%)'}} />
                                                    ) : (
                                                        <div className="bg-light rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3" style={{width:'80px', height:'80px', fontSize:'30px'}}>🏪</div>
                                                    )}
                                                    <h5 className="card-title">{shop.shop_name}</h5>
                                                    {shop.is_open == 1 ? <small className="text-success">🟢 เปิดให้บริการ</small> : <small className="text-danger">🔴 ปิดชั่วคราว</small>}
                                                    <div className="mt-3">
                                                        <button disabled={shop.is_open == 0} className={`btn btn-sm w-100 ${shop.is_open == 1 ? 'btn-soft-primary' : 'btn-secondary'}`}>{shop.is_open == 1 ? 'ดูเมนู' : 'ร้านปิด'}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <button onClick={() => setSelectedShop(null)} className="btn btn-soft-danger mb-3">&larr; เลือกร้านอื่น</button>
                            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 gap-3">
                                <div className="d-flex flex-wrap align-items-center gap-3">
                                    <div className="d-flex align-items-center">
                                        <h2 className="mb-0 me-3">{selectedShop.shop_name}</h2>
                                        <span className="badge bg-success">เปิดบริการ</span>
                                    </div>
                                    <div className="vr d-none d-md-block text-muted" style={{height: '40px'}}></div>
                                    <div className="d-flex flex-wrap gap-3 text-muted align-items-center" style={{fontSize: '0.95rem'}}>
                                        {selectedShop.description && <span className="d-flex align-items-center">📢 {selectedShop.description}</span>}
                                        {selectedShop.address && <span className="d-flex align-items-center">📍 {selectedShop.address}</span>}
                                        {selectedShop.phone && <span className="d-flex align-items-center">📞 {selectedShop.phone}</span>}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                                    onClick={() => setShowReportModal(true)}
                                >
                                    <span className="material-icons" style={{fontSize: '16px'}}>report</span> รายงานร้านนี้
                                </button>
                            </div>
                            <div className="row">
                                <div className="col-md-7 mb-3">
                                    {selectedProduct ? (
                                        <div className="card p-3 border shadow-sm mb-3">
                                            <div className="d-flex justify-content-end mb-2"><button onClick={() => setSelectedProduct(null)} className="btn-close"></button></div>
                                            <div className="d-flex align-items-center mb-3">
                                                {selectedProduct.image ? 
                                                    <img src={`${selectedProduct.image}`} style={{width: '90px', height: '90px', objectFit: 'cover', borderRadius: '12px'}} className="me-3 border" /> 
                                                    : <div className="bg-light me-3 d-flex align-items-center justify-content-center border" style={{width: '90px', height: '90px', borderRadius: '12px', fontSize: '2rem'}}>🍽️</div>
                                                }
                                                <div><h4 className="mb-1">{selectedProduct.name}</h4><h5 className="text-primary mb-0">{calculateCurrentPrice().toLocaleString()} บาท</h5></div>
                                            </div>
                                            <hr />
                                            {selectedProduct.options && selectedProduct.options.map((group, gIdx) => (
                                                <div key={gIdx} className="mb-3">
                                                    <strong>{group.name} {group.type === 'radio' && <span className="text-danger">*</span>}</strong>
                                                    {group.choices.map((choice, cIdx) => (
                                                        <div key={cIdx} className="form-check">
                                                            <input className="form-check-input" type={group.type === 'radio'?'radio':'checkbox'} name={`g_${gIdx}`} onChange={(e) => handleOptionChange(gIdx, group.type, {...choice, groupName: group.name}, e.target.checked)} checked={group.type==='radio' ? currentOptions[gIdx]?.[0]?.name===choice.name : currentOptions[gIdx]?.some(c=>c.name===choice.name)} />
                                                            <label className="form-check-label">{choice.name} {parseInt(choice.price)>0 && `(+${choice.price})`}</label>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                            <input className="form-control mb-3" placeholder="Note (เช่น ไม่ใส่ผัก)" value={note} onChange={e => setNote(e.target.value)} />
                                            <button onClick={confirmAddToCart} className="btn btn-primary w-100">ใส่ตะกร้า - {calculateCurrentPrice().toLocaleString()} บ.</button>
                                        </div>
                                    ) : (
                                        <div className="row">
                                            {products.map(p => (
                                                <div key={p.id} className="col-md-6 mb-3">
                                                    <div className="card h-100 p-2 flex-row align-items-center border position-relative" 
                                                         style={{ 
                                                             backgroundColor: p.is_available == 0 ? '#dcdcdc' : '#ffffff', 
                                                             filter: p.is_available == 0 ? 'brightness(0.95)' : 'none', 
                                                             cursor: p.is_available == 0 ? 'not-allowed' : 'default',
                                                             color: p.is_available == 0 ? '#6c757d' : 'inherit',
                                                             transition: 'all 0.3s ease'
                                                         }}>
                                                        {p.is_available == 0 && (
                                                            <div className="position-absolute top-50 start-50 translate-middle badge bg-danger border border-white shadow-sm px-3 py-2" style={{zIndex: 10, fontSize: '1.1rem'}}>สินค้าหมด</div>
                                                        )}
                                                        <img src={p.image ? `${p.image}` : "https://placehold.co/100x100"} 
                                                             style={{width:'70px', height:'70px', objectFit:'cover', borderRadius:'10px', opacity: p.is_available == 0 ? 0.5 : 1}}/>
                                                        <div className="ms-3 flex-grow-1">
                                                            <h6 className="mb-1">{p.name}</h6>
                                                            <small className={p.is_available == 0 ? "text-muted" : "text-primary" + " d-block"}>{parseInt(p.price).toLocaleString()} บ.</small>
                                                            {p.is_available == 1 ? (
                                                                <button onClick={() => handleSelectProduct(p)} className="btn btn-sm btn-soft-primary rounded-pill px-3 mt-1">เลือก</button>
                                                            ) : (
                                                                <button disabled className="btn btn-sm btn-secondary rounded-pill px-3 mt-1" style={{opacity: 0.6}}>หมด</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* เพิ่ม d-none d-md-block เพื่อซ่อนในมือถือ (แสดงเฉพาะจอใหญ่) */}
                                <div className="col-md-5 d-none d-md-block">
                                    <div className="card p-3 bg-light border-0 sticky-top" style={{top: '100px', zIndex: 1000}}>
                                        <h5 className="mb-3">🛒 ตะกร้าของคุณ</h5>
                                        {cart.length === 0 ? <p className="text-muted text-center">ยังไม่มีสินค้า</p> : (
                                            <>
                                                {cart.map(item => (
                                                    <div key={item.unique_id} className="mb-2 border-bottom pb-2">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="flex-grow-1"><strong>{item.name}</strong>{item.selected_options.map((o,i) => <div key={i} className="small text-muted">- {o.group}: {o.name}</div>)}{item.special_instruction && <div className="small text-danger">Note: {item.special_instruction}</div>}</div>
                                                            <div className="text-end" style={{minWidth: '80px'}}><div>{(item.price * item.qty).toLocaleString()}</div></div>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center mt-2">
                                                            <button onClick={() => removeFromCart(item.unique_id)} className="btn btn-sm text-danger p-0">ลบ</button>
                                                            <div className="d-flex align-items-center gap-3">
                                                                <button onClick={() => updateCartQty(item.unique_id, item.qty - 1)} className="btn btn-sm btn-soft-danger rounded-pill px-3 mt-1" disabled={item.qty <= 1}>-</button>
                                                                <span className="fw-bold">{item.qty}</span>
                                                                <button onClick={() => updateCartQty(item.unique_id, item.qty + 1)} className="btn btn-sm btn-soft-primary rounded-pill px-3 mt-1">+</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="d-flex justify-content-between fw-bold mb-3"><span>รวม</span><span>{totalPrice.toLocaleString()} บ.</span></div>
                                                
                                                <div className="mb-2">
                                                    <label className="form-label small fw-bold">📍 ที่อยู่จัดส่ง</label>
                                                    {savedAddresses.length > 0 ? (
                                                        <select className="form-select" value={selectedAddressId} onChange={handleSelectAddress}>
                                                            <option value="">-- เลือกที่อยู่ --</option>
                                                            {savedAddresses.map(addr => (
                                                                <option key={addr.id} value={addr.id}>
                                                                    {addr.address_text.substring(0, 30)}{addr.address_text.length > 30 ? '...' : ''} ({addr.contact_phone})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <button className="btn btn-outline-primary w-100 py-2 border-dashed" onClick={handleAddAddressFromCart}>
                                                            + เพิ่มที่อยู่จัดส่ง
                                                        </button>
                                                    )}
                                                    {selectedAddressId && <div className="small text-muted mt-1 bg-white p-2 border rounded">{address}</div>}
                                                </div>

                                                {/* เลือกวิธีชำระ */}
                                                <select className="form-select mb-3" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                                    {getPaymentOptions().map(opt => (
                                                        <option key={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                                <button onClick={handlePlaceOrder} className="btn btn-success w-100">ยืนยันการสั่งซื้อ</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Orders */}
            {activeTab === 'orders' && (
                <div className="row">
                    {myOrders.length === 0 ? <div className="col-12 text-center text-muted">ไม่มีประวัติ</div> : (
                        myOrders.map(o => (
                            <div key={o.id} className="col-md-6 mb-3">
                                <div className="card p-3 shadow-sm h-100 border-0">
                                    <div className="d-flex justify-content-between mb-2">
                                        <h5 className="mb-0 text-primary">{o.shop_name}</h5>
                                        <div>{getStatusBadge(o.status)}</div>
                                    </div>
                                    <small className="text-muted d-block">สั่งเมื่อ: {o.order_time}</small>
                                    <small className="text-muted d-block mb-2">📍 ที่อยู่: {o.address}</small>
                                    <div className="bg-light p-2 rounded mb-2">
                                        {o.items.map((item, index) => (
                                            <div key={index} className="d-flex justify-content-between">
                                                <small>{item.product_name} x {item.quantity}</small>
                                                <small>{parseInt(item.price).toLocaleString()}</small>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="d-flex justify-content-between align-items-end mt-auto pt-2">
                                        <div>
                                            <small className="d-block text-muted">ราคารวม</small>
                                            <h5 className="mb-0">{parseInt(o.total_price).toLocaleString()} บ.</h5>
                                            {/* แสดงวิธีชำระ */}
                                            {o.payment_method && (
                                                <small className="text-muted">
                                                    {o.payment_method}
                                                </small>
                                            )}
                                        </div>
                                        <div className="d-flex gap-2">
                                            {/* ปุ่มดูสลิป (เฉพาะที่มีสลิป) */}
                                            {o.slip_image && (
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => setViewingSlip(`${o.slip_image}`)}
                                                >
                                                    ดูสลิป
                                                </button>
                                            )}
                                            {/* ปุ่มสั่งอีกครั้ง */}
                                            <button
                                                className="btn btn-sm btn-soft-primary"
                                                onClick={() => {
                                                    const shop = shops.find(s => s.shop_name === o.shop_name);
                                                    if (shop && shop.is_open == 1) {
                                                        fetchShopMenu(shop);
                                                        setActiveTab('shops');
                                                    } else {
                                                        showAlert('ร้านปิด', '⚠️ ร้านค้านี้ปิดให้บริการอยู่ในขณะนี้');
                                                    }
                                                }}
                                            >
                                                🔄 สั่งอีกครั้ง
                                            </button>
                                            {/* ปุ่มรายงาน */}
                                            <button
                                                className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1"
                                                onClick={() => {
                                                    const shop = shops.find(s => s.shop_name === o.shop_name);
                                                    if (shop) { setSelectedShop(shop); setShowReportModal(true); }
                                                }}
                                            >
                                                <span className="material-icons" style={{fontSize: '16px'}}>report</span> รายงาน
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB: Notifications */}
            {activeTab === 'notifications' && (
                <div className="card shadow-sm p-4" style={{maxWidth: '700px', margin: '0 auto'}}>
                    <h4 className="mb-4 d-flex align-items-center gap-2">
                        <span className="material-icons text-warning">notifications</span> การแจ้งเตือน
                    </h4>

                    {myNotifications.length === 0 ? (
                        <div className="text-center text-muted py-5">
                            <span className="material-icons text-dark" style={{fontSize: '3rem'}}>notifications_off</span>
                            <div className="mt-2">ยังไม่มีการแจ้งเตือน</div>
                        </div>
                    ) : (
                        <div>
                            {myNotifications.map((n, i) => {
                                // กำหนดชื่อไอคอนตามเงื่อนไข
                                const typeIconIcon = {
                                    ban: 'gavel',
                                    unban: 'task_alt',
                                    ticket_update: 'assignment',
                                    admin_message: 'campaign'
                                }[n.type] || 'notifications';

                                // กำหนดคลาสสีของไอคอน
                                const typeIconColor = {
                                    ban: 'text-danger',
                                    unban: 'text-success',
                                    ticket_update: 'text-warning',
                                    admin_message: 'text-info'
                                }[n.type] || 'text-warning';

                                // สีพื้นหลังและสีเส้นขอบ
                                const typeBg = {
                                    ban: '#fff5f5',
                                    unban: '#f0fff4',
                                    ticket_update: '#fffbeb',
                                    admin_message: '#f0f8ff'
                                }[n.type] || '#ffffff';

                                const typeBorder = {
                                    ban: '#fc8181',
                                    unban: '#68d391',
                                    ticket_update: '#f6ad55',
                                    admin_message: '#63b3ed'
                                }[n.type] || '#e2e8f0';

                                return (
                                    <div
                                        key={i}
                                        className="mb-3 p-3 rounded border"
                                        style={{
                                            background: typeBg,
                                            borderColor: typeBorder,
                                            borderLeft: `4px solid ${typeBorder}`,
                                            opacity: n.is_read == '1' ? 0.75 : 1
                                        }}
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <div className="d-flex align-items-center gap-2">
                                                {/* ใส่คลาสสีเข้าไปตรงนี้ */}
                                                <span className={`material-icons ${typeIconColor}`} style={{fontSize: '1.2rem'}}>{typeIconIcon}</span>
                                                <strong className="small">{n.category}</strong>
                                                {(n.is_read == '0' || newNotifIds.has(n.id)) && (
                                                    <span className="badge bg-danger" style={{fontSize: '0.6rem'}}>ใหม่</span>
                                                )}
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
                    <h3 className="mb-4 text-primary">⚙️ ตั้งค่าบัญชี</h3>
                    
                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold">ชื่อ-นามสกุล</label>
                            <input className="form-control" value={profileForm.fullname} onChange={e => setProfileForm({...profileForm, fullname: e.target.value})} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold text-muted">Username (แก้ไขไม่ได้)</label>
                            <input className="form-control bg-light" value={profileForm.username} disabled />
                        </div>
                    </div>

                    <div className="row mb-3">
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold">เปลี่ยนรหัสผ่าน <small className="text-muted fw-normal">(เว้นว่างถ้าไม่เปลี่ยน)</small></label>
                            <input className="form-control" type="password" placeholder="รหัสผ่านใหม่" value={profileForm.password} onChange={e => setProfileForm({...profileForm, password: e.target.value})} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold">เบอร์โทรศัพท์หลัก</label>
                            <input className="form-control" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                        </div>
                    </div>

                    <hr className="my-4"/>

                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">📍 จัดการที่อยู่จัดส่ง</h5>
                        <button className="btn btn-sm btn-soft-primary" onClick={handleAddAddress}>+ เพิ่มที่อยู่ใหม่</button>
                    </div>

                    {profileForm.addresses.map((addr, index) => (
                        <div key={index} className="card p-3 mb-3 border bg-light position-relative">
                            <div className="row">
                                <div className="col-md-7 mb-2">
                                    <label className="small text-muted">รายละเอียดที่อยู่</label>
                                    <textarea className="form-control" rows="2" placeholder="บ้านเลขที่, ถนน, แขวง/ตำบล..." value={addr.address_text} onChange={e => handleAddressChange(index, 'address_text', e.target.value)} required></textarea>
                                </div>
                                <div className="col-md-4 mb-2">
                                    <label className="small text-muted">เบอร์ติดต่อสำหรับที่อยู่นี้</label>
                                    <input className="form-control" placeholder="08x-xxx-xxxx" value={addr.contact_phone} onChange={e => handleAddressChange(index, 'contact_phone', e.target.value)} required />
                                </div>
                                <div className="col-md-1 d-flex align-items-center justify-content-center">
                                    <button className="btn btn-outline-danger btn-sm rounded-circle" onClick={() => handleRemoveAddress(index)} title="ลบที่อยู่นี้">✕</button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="d-flex gap-2 mt-3">
                        <button className="btn btn-primary flex-grow-1 d-inline-flex align-items-center justify-content-center gap-1" onClick={handleSaveProfile}>
                            <span className="material-icons" style={{fontSize: '20px'}}>save</span> บันทึกการเปลี่ยนแปลง
                        </button>
                        <button className="btn btn-secondary" onClick={() => fetchProfileData()}>ยกเลิก</button>
                    </div>

                    <hr className="my-5"/>
                    <button 
                        className="btn btn-outline-danger w-100 py-2" 
                        onClick={() => confirmAction('ออกจากระบบ', 'ยืนยันที่จะออกจากระบบ?', () => { localStorage.removeItem('user'); navigate('/'); })}
                    >
                        ออกจากระบบ
                    </button>

                    <hr className="my-5"/>
                    

                    <div className="bg-soft-danger p-3 rounded border border-danger">
                        <h5 className="text-danger d-flex align-items-center gap-2">
                            <span className="material-icons text-warning">warning</span> ลบบัญชีถาวร
                        </h5>
                        <p className="text-muted small">หากลบบัญชี ข้อมูลทั้งหมดรวมถึงประวัติการสั่งซื้อจะถูกลบและไม่สามารถกู้คืนได้</p>
                        <div className="mb-3">
                            <label className="form-label small">พิมพ์ Username <strong>"{profileForm.username}"</strong> เพื่อยืนยัน</label>
                            <input className="form-control" placeholder={`พิมพ์ ${profileForm.username} ที่นี่`} value={deleteConfirmUsername} onChange={e => setDeleteConfirmUsername(e.target.value)} />
                        </div>
                        <button className="btn btn-danger w-100" disabled={deleteConfirmUsername !== profileForm.username} onClick={handleDeleteAccount}>ยืนยันลบบัญชีถาวร</button>
                    </div>
                </div>
            )}

            {/* Modal PopUp (Alert / Confirm) */}
            

            {/* Order Detail Popup */}
            {viewingOrder && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{maxWidth: '500px'}}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="mb-0">รายละเอียดออเดอร์ #{viewingOrder.id}</h4>
                            <button className="btn-close" onClick={() => setViewingOrder(null)}></button>
                        </div>
                        <div className="text-start mb-3 bg-light p-3 rounded">
                            <div className="d-flex justify-content-between mb-2">
                                <strong>ร้าน: {viewingOrder.shop_name}</strong>
                                <div>{getStatusBadge(viewingOrder.status)}</div>
                            </div>
                            <small className="text-muted d-block">สั่งเมื่อ: {viewingOrder.order_time}</small>
                            <hr />
                            {viewingOrder.items.map((item, idx) => (
                                <div key={idx} className="d-flex justify-content-between mb-1">
                                    <span>{item.product_name} x {item.quantity}</span>
                                    <span>{parseInt(item.price).toLocaleString()}</span>
                                </div>
                            ))}
                            <hr />
                            <div className="d-flex justify-content-between fw-bold">
                                <span>ยอดรวม</span>
                                <span className="text-primary">{parseInt(viewingOrder.total_price).toLocaleString()} บ.</span>
                            </div>
                        </div>

                        {/* ปุ่มยกเลิก (เฉพาะ Pending) */}
                        {viewingOrder.status === 'pending' ? (
                            <button 
                                className="btn btn-outline-danger w-100" 
                                // แก้ตรงนี้: ส่ง viewingOrder เข้าไปแทน id อย่างเดียว
                                onClick={() => handleCancelOrder(viewingOrder)}
                            >
                                ❌ ยกเลิกออเดอร์นี้
                            </button>
                        ) : (
                            <button className="btn btn-secondary w-100" onClick={() => setViewingOrder(null)}>ปิด</button>
                        )}
                    </div>
                </div>
            )}

            {/* Popup ชำระทันที */}
            {showPaymentPopup && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{maxWidth: '460px'}}>
                        {/* Header */}
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0 text-primary">ชำระเงิน</h5>
                            <button className="btn-close" onClick={() => setShowPaymentPopup(false)}></button>
                        </div>

                        {/* ยอด + ธนาคาร + QR — อยู่แถวเดียวกันถ้ามีทั้งคู่ */}
                        <div className="d-flex gap-3 align-items-start mb-3">
                            {/* ฝั่งซ้าย: ยอด + ธนาคาร */}
                            <div className="flex-grow-1">
                                <div className="bg-light rounded p-2 text-center mb-2">
                                    <div className="text-muted" style={{fontSize:'0.75rem'}}>ยอดที่ต้องชำระ</div>
                                    <h4 className="text-primary fw-bold mb-0">{totalPrice.toLocaleString()} บ.</h4>
                                </div>

                                {shopHasBank() && (
                                    <div className="border rounded p-2" style={{fontSize:'1rem'}}>
                                        <div className="fw-bold mb-1 small">บัญชีธนาคาร</div>
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="text-muted">ธนาคาร</span>
                                            <strong>{selectedShop.bank_name}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="text-muted">เลขบัญชี</span>
                                            <strong className="text-primary">{selectedShop.bank_account}</strong>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <span className="text-muted">ชื่อบัญชี</span>
                                            <strong>{selectedShop.bank_account_name}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ฝั่งขวา: QR Code (ถ้ามี) */}
                            {shopHasQR() && (
                                <div className="text-center flex-shrink-0">
                                    <div className="fw-bold mb-1 small">QR Code</div>
                                    <img
                                        src={`${selectedShop.qr_code}`}
                                        alt="QR Code"
                                        style={{width: '160px', height: '160px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #eee'}}
                                    />
                                </div>
                            )}
                        </div>

                        <hr className="my-2" />

                        {/* อัปโหลดสลิป */}
                        <div className="mb-2">
                            <label className="form-label fw-bold small mb-1">แนบสลิปการโอน</label>
                            <input
                                type="file"
                                className="form-control form-control-sm mb-2"
                                accept="image/*"
                                onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) { setSlipFile(file); setSlipPreview(URL.createObjectURL(file)); }
                                }}
                            />
                            {slipPreview && (
                                <img
                                    src={slipPreview}
                                    alt="slip preview"
                                    style={{maxWidth: '100%', maxHeight: '120px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #eee'}}
                                />
                            )}
                        </div>

                        <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-secondary flex-fill" onClick={() => setShowPaymentPopup(false)}>ยกเลิก</button>
                            <button className="btn btn-success flex-fill" disabled={!slipFile} onClick={handleSubmitSlip}>
                                ส่งสลิปและยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup ดูสลิป */}
            {viewingSlip && (
                <div className="modal-overlay" onClick={() => setViewingSlip(null)}>
                    <div className="modal-box" style={{maxWidth: '420px'}} onClick={e => e.stopPropagation()}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0 d-flex align-items-center gap-2">
                                <span className="material-icons text-dark">receipt_long</span> สลิปการโอน
                            </h5>
                            <button className="btn-close" onClick={() => setViewingSlip(null)}></button>
                        </div>
                        <img
                            src={viewingSlip}
                            alt="slip"
                            style={{width: '100%', borderRadius: '12px', border: '1px solid #eee'}}
                        />
                        <button className="btn btn-secondary w-100 mt-3" onClick={() => setViewingSlip(null)}>ปิด</button>
                    </div>
                </div>
            )}

            {/* Popup รายงานร้านค้า */}
            {showReportModal && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{maxWidth: '480px'}}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h4 className="mb-0 text-danger d-flex align-items-center gap-2">
                                <span className="material-icons" style={{fontSize: '28px'}}>report</span> รายงานร้านค้า
                            </h4>
                            <button className="btn-close" onClick={() => { setShowReportModal(false); setReportForm({ category: '', message: '' }); }}></button>
                        </div>
                        <p className="text-muted small mb-3">ร้าน: <strong>{selectedShop?.shop_name}</strong></p>

                        <div className="mb-3">
                            <label className="form-label fw-bold">หมวดหมู่การรายงาน <span className="text-danger">*</span></label>
                            <div className="d-flex flex-wrap gap-2">
                                {[
                                    'อาหารไม่ตรงปก',
                                    'ส่งช้าเกินไป',
                                    'ราคาไม่โปร่งใส',
                                    'พฤติกรรมไม่เหมาะสม',
                                    'สุขอนามัยน่าสงสัย',
                                    'สินค้าเสียหาย',
                                    'โกงออเดอร์',
                                    'อื่นๆ'
                                ].map(cat => (
                                    <button
                                        key={cat}
                                        className={`btn btn-sm ${reportForm.category === cat ? 'btn-danger' : 'btn-outline-secondary'}`}
                                        onClick={() => setReportForm({ ...reportForm, category: cat })}
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
                                value={reportForm.message}
                                onChange={e => setReportForm({ ...reportForm, message: e.target.value })}
                            />
                        </div>

                        <div className="d-flex gap-2">
                            <button className="btn btn-secondary flex-fill" onClick={() => { setShowReportModal(false); setReportForm({ category: '', message: '' }); }}>ยกเลิก</button>
                            <button className="btn btn-danger flex-fill" onClick={handleSubmitReport}>ส่งรายงาน</button>
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
                                <p className="text-muted mb-0">บัญชีของคุณถูกแอดมินระงับการใช้งาน</p>
                            </div>

                            {/* เหตุผลการแบน — แสดงตลอด ไม่หาย */}
                            <div className="alert alert-danger py-2 mb-3 text-start">
                                <strong>เหตุผล:</strong> {banInfo.reason || 'ไม่ระบุ'}
                                {banInfo.message && <div className="mt-1 small">{banInfo.message}</div>}
                            </div>

                            {/* สถานะคำร้อง */}
                                {appealStatus && (
                                    <div className={`alert py-2 mb-3 text-center fw-bold d-flex align-items-center justify-content-center gap-2 ${
                                        appealStatus === 'open'        ? 'alert-secondary' :
                                        appealStatus === 'in_progress' ? 'alert-warning'   :
                                        appealStatus === 'resolved'    ? 'alert-success'   :
                                        appealStatus === 'rejected'    ? 'alert-danger'    : 'alert-secondary'
                                    }`}>
                                        {{
                                            open:        (<><span className="material-icons text-secondary" style={{fontSize: '20px'}}>schedule</span> รอแอดมินรับเรื่อง</>),
                                            in_progress: (<><span className="material-icons text-dark" style={{fontSize: '20px'}}>sync</span> แอดมินกำลังดำเนินการ</>),
                                            resolved:    (<><span className="material-icons text-success" style={{fontSize: '20px'}}>check_circle</span> คำร้องเสร็จสิ้น</>),
                                            rejected:    (<><span className="material-icons text-danger" style={{fontSize: '20px'}}>cancel</span> คำร้องถูกปฏิเสธ</>),
                                        }[appealStatus]}
                                    </div>
                                )}

                            {/* ฟอร์มส่งคำร้อง — ล็อคถ้า open/in_progress */}
                            {(appealStatus === null || appealStatus === 'resolved' || appealStatus === 'rejected') ? (
                                <div className="mb-3">
                                    <label className="form-label fw-bold d-flex align-items-center gap-1">
                                        <span className="material-icons text-primary" style={{fontSize: '20px'}}>edit_document</span> คำร้องขออุทธรณ์
                                    </label>
                                    {appealStatus === 'resolved' && (
                                        <div className="small text-muted mb-2">คำร้องก่อนหน้าเสร็จสิ้นแล้ว สามารถส่งใหม่ได้</div>
                                    )}
                                    {appealStatus === 'rejected' && (
                                        <div className="small text-muted mb-2">คำร้องก่อนหน้าถูกปฏิเสธ สามารถส่งใหม่ได้</div>
                                    )}
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
                                    <div className="d-flex align-items-center justify-content-center gap-1 mb-1">
                                        <span className="material-icons text-secondary" style={{fontSize: '18px'}}>lock</span>
                                        <span>ไม่สามารถส่งคำร้องได้ในขณะนี้</span>
                                    </div>
                                    กรุณารอแอดมินพิจารณาคำร้องที่ส่งไปแล้ว
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

            {/* แสดงเฉพาะตอนมีของในตะกร้า + อยู่หน้าร้านค้า + และเป็นหน้าจอมือถือ */}
            {cart.length > 0 && activeTab === 'shops' && selectedShop && (
                <div className="d-block d-md-none fixed-bottom p-3" style={{zIndex: 1060, bottom: '60px'}}> 
                    {/* bottom: 60px เพื่อให้ลอยอยู่เหนือเมนูบาร์ (A) ไม่ทับกัน */}
                    <div 
                        className="card bg-dark text-white shadow-lg border-0" 
                        style={{borderRadius: '15px', cursor: 'pointer'}}
                        onClick={() => setShowMobileCart(true)}
                    >
                        <div className="card-body d-flex justify-content-between align-items-center p-3">
                            <div className="d-flex align-items-center">
                                <div className="bg-success rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold" style={{width:'40px', height:'40px'}}>
                                    {cart.reduce((s,i)=>s+i.qty,0)}
                                </div>
                                <div className="d-flex flex-column">
                                    <span className="fw-bold fs-6">ยอดรวม {totalPrice.toLocaleString()} บ.</span>
                                    <small className="text-white-50" style={{fontSize: '0.75rem'}}>แตะเพื่อดูตะกร้า</small>
                                </div>
                            </div>
                            <span className="fs-3">🛒</span>
                        </div>
                    </div>
                </div>
            )}
            {/*  C. Mobile Cart Popup (หน้าต่างตะกร้าสำหรับมือถือ)  */}
            {showMobileCart && (
                <div className="modal-overlay" style={{alignItems: 'flex-end'}}> {/* จัดให้ชิดล่างเหมือน Bottom Sheet */}
                    <div className="modal-box w-100 rounded-top-4 p-0" style={{maxWidth: '100%', borderRadius: '20px 20px 0 0', animation: 'slideUp 0.3s ease-out'}}>
                        
                        {/* Header ของตะกร้า */}
                        <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light rounded-top-4">
                            <h5 className="mb-0">🛒 ตะกร้าสินค้า</h5>
                            <button className="btn-close" onClick={() => setShowMobileCart(false)}></button>
                        </div>

                        {/* เนื้อหาตะกร้า (Scroll ได้) */}
                        <div className="p-3" style={{maxHeight: '60vh', overflowY: 'auto'}}>
                            {cart.map(item => (
                                <div key={item.unique_id} className="mb-3 border-bottom pb-2">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div className="flex-grow-1">
                                            <div className="fw-bold">{item.name}</div>
                                            {item.selected_options.map((o,i) => <div key={i} className="small text-muted">- {o.group}: {o.name}</div>)}
                                            {item.special_instruction && <div className="small text-danger">Note: {item.special_instruction}</div>}
                                        </div>
                                        <div className="text-end" style={{minWidth: '70px'}}>
                                            <div>{(item.price * item.qty).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-2">
                                        <button onClick={() => removeFromCart(item.unique_id)} className="btn btn-sm text-danger p-0">ลบ</button>
                                        <div className="d-flex align-items-center gap-3 bg-light rounded-pill px-2">
                                            <button onClick={() => updateCartQty(item.unique_id, item.qty - 1)} className="btn btn-sm btn-link text-decoration-none text-dark fw-bold px-2" disabled={item.qty <= 1}>-</button>
                                            <span className="fw-bold">{item.qty}</span>
                                            <button onClick={() => updateCartQty(item.unique_id, item.qty + 1)} className="btn btn-sm btn-link text-decoration-none text-primary fw-bold px-2">+</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer สรุปยอดและสั่งซื้อ */}
                        <div className="p-3 border-top bg-white">
                            <div className="d-flex justify-content-between fw-bold mb-3 fs-5">
                                <span>รวมทั้งสิ้น</span>
                                <span className="text-primary">{totalPrice.toLocaleString()} บ.</span>
                            </div>

                            {/* เลือกที่อยู่ */}
                            <div className="mb-2">
                                <label className="form-label small fw-bold">📍 ที่อยู่จัดส่ง</label>
                                {savedAddresses.length > 0 ? (
                                    <select className="form-select" value={selectedAddressId} onChange={handleSelectAddress}>
                                        <option value="">-- เลือกที่อยู่ --</option>
                                        {savedAddresses.map(addr => (
                                            <option key={addr.id} value={addr.id}>
                                                {addr.address_text.substring(0, 25)}...
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <button className="btn btn-outline-primary w-100 border-dashed" onClick={() => { setShowMobileCart(false); handleAddAddressFromCart(); }}>
                                        + เพิ่มที่อยู่จัดส่ง
                                    </button>
                                )}
                                {selectedAddressId && <div className="small text-muted mt-1 bg-light p-2 border rounded text-truncate">{address}</div>}
                            </div>

                            {/* เลือกวิธีชำระ */}
                            <select className="form-select mb-3" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                {getPaymentOptions().map(opt => (
                                    <option key={opt}>{opt}</option>
                                ))}
                            </select>

                            <button onClick={handlePlaceOrder} className="btn btn-success w-100 py-2 fs-5 shadow-sm">
                                ยืนยันการสั่งซื้อ
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Mobile Bottom Navigation */}
            <div className="d-block d-md-none fixed-bottom bg-white border-top shadow-lg" style={{zIndex: 1050}}>
                <div className="d-flex justify-content-around py-2">
                    <button className={`btn border-0 ${activeTab === 'shops' ? 'text-primary' : 'text-muted'}`} onClick={() => setActiveTab('shops')}>
                        <div style={{fontSize: '1.5rem'}}>🏪</div>
                        <small style={{fontSize: '0.7rem'}}>ร้านค้า</small>
                    </button>
                    <button className={`btn border-0 position-relative ${activeTab === 'orders' ? 'text-primary' : 'text-muted'}`} onClick={() => setActiveTab('orders')}>
                        <div style={{fontSize: '1.5rem'}}>📜</div>
                        <small style={{fontSize: '0.7rem'}}>ออเดอร์</small>
                        {activeOrdersCount > 0 && <span className="position-absolute top-0 start-70 translate-middle badge rounded-pill bg-danger" style={{fontSize: '0.6rem'}}>{activeOrdersCount}</span>}
                    </button>
                    <button className={`btn border-0 position-relative ${activeTab === 'notifications' ? 'text-primary' : 'text-muted'}`}
                        onClick={() => { setActiveTab('notifications'); markNotificationsRead(); }}>
                        <div style={{fontSize: '1.5rem'}}>🔔</div>
                        <small style={{fontSize: '0.7rem'}}>แจ้งเตือน</small>
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <button className={`btn border-0 ${activeTab === 'settings' ? 'text-primary' : 'text-muted'}`} onClick={() => setActiveTab('settings')}>
                        <div style={{fontSize: '1.5rem'}}>⚙️</div>
                        <small style={{fontSize: '0.7rem'}}>ตั้งค่า</small>
                    </button>
                </div>
            </div>
            
        {/* ... (โค้ดเนื้อหา Tab ต่างๆ ด้านบน) ... */}

            {/* เพิ่มตรงนี้: พื้นที่กันชนสำหรับมือถือ (Spacer) 
                ช่วยดันเนื้อหาให้พ้นจากเมนูด้านล่าง (Nav Bar) และแถบตะกร้า
            */}
            <div className="d-block d-md-none" style={{ height: '60px' }}></div>

            {modal.show && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h4 className="mb-3">{modal.title}</h4>
                        <p className="text-muted mb-4">{modal.message}</p>
                        <div className="d-flex justify-content-center gap-2">
                            {modal.type === 'confirm' && (
                                <button 
                                    className="btn btn-secondary flex-fill" 
                                    // แก้ตรงนี้: ถ้ามี onCancel ให้ทำตามนั้น (เด้งกลับ) ถ้าไม่มีให้ปิดเฉยๆ
                                    onClick={() => {
                                        if (modal.onCancel) modal.onCancel();
                                        else closeModal();
                                    }}
                                >
                                    ยกเลิก
                                </button>
                            )}
                            <button className="btn btn-primary flex-fill" onClick={modal.onConfirm}>ตกลง</button>
                        </div>
                    </div>
                </div>
            )}

        </div> // <-- นี่คือปิด div className="container mt-4 pb-5"
        
    );
}

export default Customer;