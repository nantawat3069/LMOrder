const STATUSES = ['all', 'pending', 'accepted', 'cooking', 'delivering', 'completed', 'cancelled'];

const LABELS = {
    all:        { icon: 'list',            color: 'text-primary',  label: 'ทั้งหมด' },
    pending:    { icon: 'schedule',        color: 'text-warning',  label: 'รอรับ'   },
    accepted:   { icon: 'check_circle',    color: 'text-primary',  label: 'รับแล้ว' },
    cooking:    { icon: 'soup_kitchen',    color: 'text-warning',  label: 'ปรุง'    },
    delivering: { icon: 'delivery_dining', color: 'text-info',     label: 'ส่ง'     },
    completed:  { icon: 'task_alt',        color: 'text-success',  label: 'สำเร็จ'  },
    cancelled:  { icon: 'cancel',          color: 'text-danger',   label: 'ยกเลิก'  },
};

function OrderFilterBar({ value, onChange }) {
    return (
        <div className="d-flex gap-1 mb-3 flex-wrap">
            {STATUSES.map(s => {
                const active = value === s;
                const { icon, color, label } = LABELS[s];
                return (
                    <button
                        key={s}
                        className={`btn btn-sm ${active ? 'btn-danger' : 'btn-outline-secondary'} d-inline-flex align-items-center gap-0`}
                        style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                        onClick={() => onChange(s)}
                    >
                        <span className={`material-icons ${active ? '' : color}`} style={{ fontSize: '14px' }}>{icon}</span>
                        {' '}{label}
                    </button>
                );
            })}
        </div>
    );
}

export default OrderFilterBar;
