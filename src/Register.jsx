import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from './config';

function Register() {
    const [inputs, setInputs] = useState({
        username: '', password: '', fullname: '', phone: '', role: 'customer'
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setInputs({...inputs, [e.target.name]: e.target.value});
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE_URL}/auth.php`, {
                action: 'register',
                ...inputs
            });
            if (res.data.status === 'success') {
                alert('สมัครสมาชิกสำเร็จ!');
                navigate('/');
            } else {
                alert(res.data.message);
            }
        } catch (err) { console.error(err); }
    }

    return (
        <div className="container mt-5">
            <div className="card shadow p-4 mx-auto" style={{maxWidth: '500px'}}>
                <h3 className="text-center">สมัครสมาชิกใหม่</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-2"><label>Username</label><input className="form-control" name="username" onChange={handleChange} required/></div>
                    <div className="mb-2"><label>Password</label><input className="form-control" type="password" name="password" onChange={handleChange} required/></div>
                    <div className="mb-2"><label>ชื่อ-นามสกุล</label><input className="form-control" name="fullname" onChange={handleChange} required/></div>
                    <div className="mb-2"><label>เบอร์โทร</label><input className="form-control" name="phone" onChange={handleChange} required/></div>
                    <div className="mb-3">
                        <label>ประเภทผู้ใช้</label>
                        <select className="form-control" name="role" onChange={handleChange}>
                            <option value="customer">ลูกค้า (สั่งอาหาร)</option>
                            <option value="merchant">ร้านค้า (ขายอาหาร)</option>
                        </select>
                    </div>
                    <button className="btn btn-success w-100">สมัครสมาชิก</button>
                </form>
                <div className="mt-3 text-center"><Link to="/">กลับไปหน้าเข้าสู่ระบบ</Link></div>
            </div>
        </div>
    );
}

export default Register;