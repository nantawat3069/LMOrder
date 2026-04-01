import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export function useNotifications() {
    const [myNotifications, setMyNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [newNotifIds, setNewNotifIds] = useState(new Set());

    const fetchMyNotifications = async (uid) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/admin.php?action=get_my_notifications&user_id=${uid}`);
            if (res.data.status === 'success') {
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

    const markNotificationsRead = async (userId) => {
        if (!userId || unreadCount === 0) return;
        try {
            await axios.post(`${API_BASE_URL}/admin.php`, {
                action: 'mark_notifications_read',
                user_id: userId
            });
            setUnreadCount(0);
            setMyNotifications(prev => prev.map(n => ({ ...n, is_read: '1' })));
        } catch (err) { console.error(err); }
    };

    return { myNotifications, unreadCount, newNotifIds, fetchMyNotifications, markNotificationsRead };
}
