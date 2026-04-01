export const getStatusBadge = (status) => {
    const map = {
        pending:    ['bg-secondary', 'รอร้านรับ'],
        accepted:   ['bg-primary',   'รับออเดอร์แล้ว'],
        cooking:    ['bg-warning text-dark', 'กำลังปรุง'],
        delivering: ['bg-info text-dark',    'กำลังส่ง'],
        completed:  ['bg-success',   'สำเร็จ'],
        cancelled:  ['bg-danger',    'ยกเลิก'],
    };
    const [cls, label] = map[status] || ['bg-secondary', status];
    return <span className={`badge ${cls}`}>{label}</span>;
};

export const getPaymentBadge = (order) => {
    if (order.slip_image) return <span className="badge bg-success">ชำระแล้ว</span>;
    if (order.payment_method === 'เงินสด ปลายทาง') return <span className="badge bg-danger">ยังไม่ชำระ (เงินสด)</span>;
    if (order.payment_method === 'ธนาคาร/QR-code ปลายทาง') return <span className="badge bg-danger">ยังไม่ชำระ (โอน)</span>;
    return null;
};
