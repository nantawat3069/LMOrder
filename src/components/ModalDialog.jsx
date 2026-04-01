function ModalDialog({ modal, closeModal, confirmBtnClass = 'btn-primary' }) {
    if (!modal.show) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-box">
                <h4 className="mb-3">{modal.title}</h4>
                <p className="text-muted mb-4">{modal.message}</p>
                <div className="d-flex justify-content-center gap-2">
                    {modal.type === 'confirm' && (
                        <button
                            className="btn btn-secondary flex-fill"
                            onClick={() => {
                                if (modal.onCancel) modal.onCancel();
                                else closeModal();
                            }}
                        >
                            ยกเลิก
                        </button>
                    )}
                    <button className={`btn ${confirmBtnClass} flex-fill`} onClick={modal.onConfirm}>ตกลง</button>
                </div>
            </div>
        </div>
    );
}

export default ModalDialog;
