import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function ShopMenu() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [shop, setShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [user, setUser] = useState(null);

    // States สำหรับการเลือกเมนู
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [currentOptions, setCurrentOptions] = useState({});
    const [note, setNote] = useState('');

    // States สำหรับตะกร้า
    const [address, setAddress] = useState(''); 
    const [paymentMethod, setPaymentMethod] = useState('เงินสด (COD)');
    const [error, setError] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
        else navigate('/');
        fetchMenu();
    }, [id]);

    const fetchMenu = async () => {
        try {
            const res = await axios.get(`https://lmorder-production.up.railway.app/customer.php?action=get_shop_menu&shop_id=${id}`);
            if (res.data.status === 'success') {
                setShop(res.data.shop);
                setProducts(res.data.products);
            }
        } catch (err) { console.error(err); }
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setCurrentOptions({});
        setNote('');
    };

    const handleOptionChange = (groupIndex, groupType, choice, isChecked) => {
        const newOptions = { ...currentOptions };
        
        if (groupType === 'radio') {
            newOptions[groupIndex] = [choice];
        } else {
            if (!newOptions[groupIndex]) newOptions[groupIndex] = [];
            if (isChecked) {
                newOptions[groupIndex].push(choice);
            } else {
                newOptions[groupIndex] = newOptions[groupIndex].filter(c => c.name !== choice.name);
            }
        }
        setCurrentOptions(newOptions);
    };

    const calculateCurrentPrice = () => {
        if (!selectedProduct) return 0;
        let total = parseInt(selectedProduct.price);
        Object.values(currentOptions).flat().forEach(opt => {
            total += parseInt(opt.price || 0);
        });
        return total;
    };

    const confirmAddToCart = () => {
        // เช็คว่าเลือก Radio ครบไหม
        if (selectedProduct.options) {
            for (let i = 0; i < selectedProduct.options.length; i++) {
                const group = selectedProduct.options[i];
                if (group.type === 'radio' && (!currentOptions[i] || currentOptions[i].length === 0)) {
                    alert(`กรุณาเลือก "${group.name}"`);
                    return;
                }
            }
        }

        const finalPrice = calculateCurrentPrice();
        const selectedOptionsList = Object.values(currentOptions).flat();

        const cartItem = {
            ...selectedProduct,
            unique_id: Date.now(),
            qty: 1,
            price: finalPrice,
            selected_options: selectedOptionsList.map(opt => ({ 
                group: opt.groupName,
                name: opt.name, 
                price: opt.price 
            })),
            special_instruction: note
        };

        setCart([...cart, cartItem]);
        setSelectedProduct(null);
    };

    const removeFromCart = (unique_id) => {
        setCart(cart.filter(item => item.unique_id !== unique_id));
    };

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const handlePlaceOrder = async () => {
        setError('');
        if (cart.length === 0) { setError("ตะกร้ายังว่างอยู่ครับ"); return; }
        if (!address.trim()) { setError("กรุณากรอกที่อยู่จัดส่ง"); return; }

        try {
            const res = await axios.post('https://lmorder-production.up.railway.app/order.php', {
                action: 'place_order',
                customer_id: user.id,
                shop_id: shop.id,
                total_price: totalPrice,
                address: address,
                payment_method: paymentMethod,
                items: cart
            });

            if (res.data.status === 'success') {
                alert("สั่งซื้อสำเร็จ!");
                navigate('/customer');
            } else { setError(res.data.message); }
        } catch (err) { setError("เกิดข้อผิดพลาด"); }
    };

    if (!shop) return <div className="text-center mt-5">กำลังโหลด...</div>;

    return (
        <div className="container mt-4 mb-5">
            <button onClick={() => navigate('/customer')} className="btn btn-secondary mb-3">&larr; เลือกร้านอื่น</button>
            <div className="row">
                
                {/*  ฝั่งซ้าย: พื้นที่แสดงรายการเมนู หรือ หน้ากำหนดเมนู  */}
                <div className="col-md-7 mb-3">
                    {/* ใส่กล่องขาวคลุมทั้งหมดตามที่ขอ */}
                    <div className="p-4 bg-white rounded shadow-sm h-100">
                        <div className="d-flex align-items-center mb-4">
                            <h2 className="mb-0 me-3">{shop.shop_name}</h2>
                            <span className="badge bg-success">เปิดบริการ</span>
                        </div>

                        {selectedProduct ? (
                            <div className="animate-fade-in"> {/* เพิ่ม Animation เล็กน้อย */}
                                <button onClick={() => setSelectedProduct(null)} className="btn btn-sm btn-outline-secondary mb-3">&larr; ย้อนกลับ</button>
                                <div className="d-flex mb-3">
                                    {selectedProduct.image && <img src={`${selectedProduct.image}`} style={{width:'100px', height:'100px', objectFit:'cover', borderRadius:'10px'}} className="me-3" />}
                                    <div>
                                        <h3>{selectedProduct.name}</h3>
                                        <h4 className="text-primary">{calculateCurrentPrice().toLocaleString()} บาท</h4>
                                    </div>
                                </div>
                                <hr />
                                {selectedProduct.options && selectedProduct.options.map((group, gIdx) => (
                                    <div key={gIdx} className="mb-4">
                                        <h5 className="mb-2">{group.name} {group.type === 'radio' && <span className="text-danger">*</span>}</h5>
                                        {group.choices.map((choice, cIdx) => (
                                            <div key={cIdx} className="form-check mb-2">
                                                <input 
                                                    className="form-check-input" 
                                                    type={group.type === 'radio' ? 'radio' : 'checkbox'}
                                                    name={`group_${gIdx}`}
                                                    id={`opt_${gIdx}_${cIdx}`}
                                                    onChange={(e) => handleOptionChange(gIdx, group.type, { ...choice, groupName: group.name }, e.target.checked)}
                                                    checked={
                                                        group.type === 'radio' 
                                                        ? currentOptions[gIdx]?.[0]?.name === choice.name
                                                        : currentOptions[gIdx]?.some(c => c.name === choice.name)
                                                    }
                                                />
                                                <label className="form-check-label d-flex justify-content-between" htmlFor={`opt_${gIdx}_${cIdx}`} style={{width: '100%', cursor:'pointer'}}>
                                                    <span>{choice.name}</span>
                                                    {parseInt(choice.price) > 0 && <span className="text-muted">+{choice.price} บ.</span>}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                                <div className="mb-4">
                                    <label className="form-label">ข้อความเพิ่มเติม (Note)</label>
                                    <input className="form-control" placeholder="เช่น ไม่ใส่ผัก, ขอช้อนส้อม" value={note} onChange={(e) => setNote(e.target.value)} />
                                </div>
                                <button onClick={confirmAddToCart} className="btn btn-primary w-100 py-3 fs-5">
                                    ใส่ตะกร้า - {calculateCurrentPrice().toLocaleString()} บ.
                                </button>
                            </div>
                        ) : (
                            <div className="row">
                                {products.map(p => (
                                    <div key={p.id} className="col-md-6 mb-3">
                                        {/* ปรับการ์ดเมนูย่อย ให้กลืนกับพื้นหลังขาว หรือเด่นขึ้นมานิดหน่อย */}
                                        <div className="card h-100 p-3 flex-row align-items-center border shadow-sm">
                                            <img src={p.image ? `${p.image}` : "https://placehold.co/100x100"} style={{width: '90px', height: '90px', objectFit: 'cover', borderRadius: '15px'}}/>
                                            <div className="ms-3 flex-grow-1">
                                                <h5 className="mb-1">{p.name}</h5>
                                                <h6 className="text-primary mb-2">{parseInt(p.price).toLocaleString()} บ.</h6>
                                                <button onClick={() => handleSelectProduct(p)} className="btn btn-sm btn-outline-primary rounded-pill px-3">เลือก</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/*  ฝั่งขวา: ตะกร้า  */}
                <div className="col-md-5">
                    <div className="card p-4 shadow-sm sticky-top" style={{top: '20px'}}>
                        <h4 className="mb-3">🛒 ตะกร้าของฉัน</h4>
                        {cart.length === 0 ? <p className="text-muted text-center py-3">ยังไม่มีสินค้า</p> : (
                            <>
                                <ul className="list-group list-group-flush mb-3">
                                    {cart.map(item => (
                                        <li key={item.unique_id} className="list-group-item px-0">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <strong>{item.name}</strong>
                                                    {item.selected_options.map((opt, i) => <div key={i} className="text-muted small ps-2">- {opt.group}: {opt.name}</div>)}
                                                    {item.special_instruction && <div className="text-danger small ps-2">Note: {item.special_instruction}</div>}
                                                </div>
                                                <div className="text-end">
                                                    <div>{item.price.toLocaleString()} บ.</div>
                                                    <button onClick={() => removeFromCart(item.unique_id)} className="btn btn-sm text-danger p-0">ลบ</button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5>ยอดรวม</h5>
                                    <h3 className="text-primary">{totalPrice.toLocaleString()} บ.</h3>
                                </div>
                                <hr />
                                <div className="mb-3"><label>📍 ที่อยู่จัดส่ง</label><textarea className="form-control" rows="2" value={address} onChange={(e) => setAddress(e.target.value)}></textarea></div>
                                <div className="mb-4">
                                    <label>💳 วิธีชำระเงิน</label>
                                    <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                                        <option value="เงินสด (COD)">💵 เงินสด</option>
                                        <option value="โอนเงิน">📲 โอนเงิน</option>
                                    </select>
                                </div>
                                {error && <div className="alert alert-danger py-2 text-center">{error}</div>}
                                <button onClick={handlePlaceOrder} className="btn btn-primary w-100 py-3 fs-5">ยืนยันการสั่งซื้อ</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ShopMenu;