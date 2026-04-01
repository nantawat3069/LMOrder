function NotificationItem({ n, newNotifIds }) {
    const typeIconIcon = {
        ban: 'gavel',
        unban: 'task_alt',
        ticket_update: 'assignment',
        admin_message: 'campaign'
    }[n.type] || 'notifications';

    const typeIconColor = {
        ban: 'text-danger',
        unban: 'text-success',
        ticket_update: 'text-warning',
        admin_message: 'text-info'
    }[n.type] || 'text-warning';

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
                    <span className={`material-icons ${typeIconColor}`} style={{fontSize: '1.2rem'}}>{typeIconIcon}</span>
                    <strong className="small">{n.category}</strong>
                    {(n.is_read == '0' || newNotifIds.has(n.id)) && (
                        <span className="badge bg-danger" style={{fontSize: '0.6rem'}}>ใหม่</span>
                    )}
                </div>
                <small className="text-muted">
                    {n.created_at?.split(' ')[0]} {n.created_at?.split(' ')[1]?.substring(0, 5)}
                </small>
            </div>
            <p className="mb-1 small">{n.message}</p>
            {n.admin_name && <small className="text-muted">โดย: {n.admin_name}</small>}
        </div>
    );
}

export default NotificationItem;
