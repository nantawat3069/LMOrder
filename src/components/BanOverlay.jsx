function BanOverlay({ isBanned, banInfo, appealStatus, banAppealMessage, setBanAppealMessage, handleAppeal, onLogout, subtitle }) {
    if (!isBanned) return null;
    return (
        <div className="modal-overlay" style={{zIndex: 99999}}>
            <div className="modal-box" style={{maxWidth: '480px'}}>
                <div className="text-center mb-3">
                    <div style={{fontSize: '3rem'}}>🔨</div>
                    <h3 className="text-danger mb-1">บัญชีถูกระงับ</h3>
                    <p className="text-muted mb-0">{subtitle || 'บัญชีของคุณถูกแอดมินระงับการใช้งาน'}</p>
                </div>

                <div className="alert alert-danger py-2 mb-3 text-start">
                    <strong>เหตุผล:</strong> {banInfo.reason || 'ไม่ระบุ'}
                    {banInfo.message && <div className="mt-1 small">{banInfo.message}</div>}
                </div>

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

                {(appealStatus === null || appealStatus === 'resolved' || appealStatus === 'rejected') ? (
                    <div className="mb-3">
                        <label className="form-label fw-bold d-flex align-items-center gap-1">
                            <span className="material-icons text-primary" style={{fontSize: '20px'}}>edit_document</span> คำร้องขออุทธรณ์
                        </label>
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
                        <div className="d-flex align-items-center justify-content-center gap-1 mb-1">
                            <span className="material-icons text-secondary" style={{fontSize: '18px'}}>lock</span>
                            <span>ไม่สามารถส่งคำร้องได้ในขณะนี้</span>
                        </div>
                        กรุณารอแอดมินพิจารณาคำร้องที่ส่งไปแล้ว
                    </div>
                )}

                <div className="d-flex gap-2">
                    <button className="btn btn-outline-danger flex-fill" onClick={onLogout}>
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
    );
}

export default BanOverlay;
