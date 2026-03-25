import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
    const [inputs, setInputs] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setInputs({...inputs, [e.target.name]: e.target.value});
        setError('');
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://192.168.1.36/LMOrder/api/auth.php', {
                action: 'login',
                ...inputs
            });

            if (res.data.status === 'success') {
                localStorage.setItem('user', JSON.stringify(res.data.user));
                if(res.data.user.role === 'admin') {
                    navigate('/admin');
                } else if(res.data.user.role === 'merchant') {
                    navigate('/merchant');
                } else {
                    navigate('/customer');
                }
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        }
    }

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-5">
                    <div className="card shadow p-4">
                        <h2 className="text-center mb-4">เข้าสู่ระบบ LM Order</h2>
                        
                        {/* โชว์ข้อความ error สีแดงตรงนี้ */}
                        {error && <div className="alert alert-danger text-center p-2 mb-3">{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label>Username</label>
                                <input type="text" name="username" className="form-control" onChange={handleChange} required/>
                            </div>
                            <div className="mb-3">
                                <label>Password</label>
                                <input type="password" name="password" className="form-control" onChange={handleChange} required/>
                            </div>
                            <button type="submit" className="btn btn-primary w-100">Login</button>
                        </form>
                        <p className="text-center mt-3">
                            ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;