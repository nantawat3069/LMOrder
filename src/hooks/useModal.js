import { useState } from 'react';

export function useModal() {
    const [modal, setModal] = useState({ show: false, type: 'alert', title: '', message: '', onConfirm: null });

    const showAlert = (title, message) =>
        setModal({ show: true, type: 'alert', title, message, onConfirm: () => setModal(m => ({ ...m, show: false })) });

    const confirmAction = (title, message, action) =>
        setModal({ show: true, type: 'confirm', title, message, onConfirm: () => { action(); setModal(m => ({ ...m, show: false })); } });

    const closeModal = () => setModal(m => ({ ...m, show: false }));

    return { modal, setModal, showAlert, confirmAction, closeModal };
}
