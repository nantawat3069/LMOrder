import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function AdminRegister() {
    const navigate = useNavigate();
    const [inputs, setInputs] = useState({
        secret_key: '',
        username: '',
        password: '',
        fullname: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setInputs({ ...inputs, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('https://lmorder-production.up.railway.app/auth.php', {
                action: 'register_admin',
                ...inputs
            });

            if (res.data.status === 'success') {
                // Auto Login -> เข้า Admin Panel เลย
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/admin');
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <div className="card shadow p-4">

                        {/* Header */}
                        <div className="text-center mb-4">
                            <div className="d-flex align-items-center justify-content-center rounded-circle bg-danger text-white mx-auto mb-3"
                                style={{ width: 60, height: 60, fontSize: '1.8rem' }}>
                                🛡️
                            </div>
                            <h3 className="mb-0 text-danger">สร้างบัญชี Admin</h3>
                            <small className="text-muted">เฉพาะผู้มีสิทธิ์เท่านั้น</small>
                        </div>

                        {error && (
                            <div className="alert alert-danger text-center p-2 mb-3">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Secret Key */}
                            <div className="mb-3">
                                <label className="form-label fw-bold">🔑 Secret Key</label>
                                <input
                                    type="password"
                                    name="secret_key"
                                    className="form-control"
                                    placeholder="กรอก Secret Key"
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <hr className="my-3" />

                            {/* Username */}
                            <div className="mb-3">
                                <label className="form-label fw-bold">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    className="form-control"
                                    placeholder="ชื่อผู้ใช้"
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="mb-3">
                                <label className="form-label fw-bold">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    className="form-control"
                                    placeholder="รหัสผ่าน"
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Fullname */}
                            <div className="mb-3">
                                <label className="form-label fw-bold">ชื่อ-นามสกุล</label>
                                <input
                                    type="text"
                                    name="fullname"
                                    className="form-control"
                                    placeholder="ชื่อจริง"
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div className="mb-4">
                                <label className="form-label fw-bold">เบอร์โทรศัพท์</label>
                                <input
                                    type="text"
                                    name="phone"
                                    className="form-control"
                                    placeholder="08x-xxx-xxxx"
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-danger w-100"
                                disabled={loading}
                            >
                                {loading ? 'กำลังสร้างบัญชี...' : '🛡️ สร้างบัญชี Admin'}
                            </button>
                        </form>

                        <p className="text-center mt-3">
                            <Link to="/" className="text-muted small">← กลับหน้า Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminRegister;