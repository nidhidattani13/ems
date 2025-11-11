import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/Auth.css';
import FaceEnroll from '../components/FaceEnroll';

const Register = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    department_id: '',
    designation_id: '',
    reporting_head_id: '',
  });
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesError, setEmployeesError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFaceEnroll, setShowFaceEnroll] = useState(false);
  const [faceEnrollComplete, setFaceEnrollComplete] = useState(false);
  const [registeredEmployeeId, setRegisteredEmployeeId] = useState(null);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const nameRegex = /^[A-Za-z .]{2,}$/; // alphabets, space, dot
  const pwdRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{7,}$/; // >6, number, special

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (formData.department_id) {
      fetchDesignations(formData.department_id);
    }
  }, [formData.department_id]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchDesignations = async (departmentId) => {
    try {
      const response = await api.get(`/designations/department/${departmentId}`);
      setDesignations(response.data.data || []);
    } catch (err) {
      console.error('Error fetching designations:', err);
      setDesignations([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      setEmployeesError('');
      const response = await api.get('/employees/public');
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      // sort by name asc
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setEmployees(list);
    } catch (err) {
      setEmployees([]);
      setEmployeesError('Failed to load reporting heads');
    }
    finally {
      setEmployeesLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // if department changed, clear designation selection
      ...(name === 'department_id' ? { designation_id: '' } : {}),
    }));
    // Don't immediately clear error/success to avoid flicker
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Basic validations
    if (!nameRegex.test(formData.name.trim())) {
      setError('Enter a valid full name (alphabets, space and dot)');
      setLoading(false);
      return;
    }
    if (!emailRegex.test(formData.email.trim())) {
      setError('Enter a valid email address');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!pwdRegex.test(formData.password)) {
      setError('Password must be 7+ chars with a number and a special character');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...dataToSend } = formData;

      const sanitizedData = {
        ...dataToSend,
        department_id: dataToSend.department_id || null,
        designation_id: dataToSend.designation_id || null,
        reporting_head_id: dataToSend.reporting_head_id || null,
      };

      const res = await register(sanitizedData);
      
      // Check if registration was successful and user has an ID
      // res structure: { status, message, data: user }
      if (res?.data?.id) {
        setRegisteredEmployeeId(res.data.id);
        setShowFaceEnroll(true);
        setSuccess('Registration successful! Please enroll your face.');
      } else {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceEnrollComplete = () => {
    setFaceEnrollComplete(true);
    setShowFaceEnroll(false);
    setSuccess('Face enrollment complete! You can now sign in.');
  };

  if (showFaceEnroll && registeredEmployeeId) {
    return (
      <div className="register-container">
        <FaceEnroll
          employeeId={registeredEmployeeId}
          name={formData.name}
          onComplete={handleFaceEnrollComplete}
        />
      </div>
    );
  }


  if (faceEnrollComplete) {
    return (
      <div className="register-container">
        <div className="success-message">
          <h2>Registration and Face Enrollment Complete!</h2>
          <p>You can now log in with your credentials.</p>
          <a href="/login" className="auth-footer">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <h2 className="form-heading">Register</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {formData.role === 'employee' ? (
            <div className="form-group">
              <label>Department</label>
              <select
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group" />
          )}
        </div>

        {formData.role === 'employee' && (
          formData.department_id ? (
            <div className="form-row">
              <div className="form-group">
                <label>Designation</label>
                <select
                  name="designation_id"
                  value={formData.designation_id}
                  onChange={handleChange}
                  required={designations.length > 0}
                >
                  <option value="">Select Designation</option>
                  {designations.length === 0 ? (
                    <option value="" disabled>No designations</option>
                  ) : (
                    designations.map((desig) => (
                      <option key={desig.id} value={desig.id}>
                        {desig.title || desig.name || desig.label || ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Reporting Head</label>
                <select
                  name="reporting_head_id"
                  value={formData.reporting_head_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Reporting Head</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="form-row single-row">
              <div className="form-group">
                <label>Reporting Head</label>
                <select
                  name="reporting_head_id"
                  value={formData.reporting_head_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Reporting Head</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        )}

        <div className="form-row button-row">
          <div className="form-group">
            <button type="submit" disabled={loading} className="auth-button register-button">
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Register;