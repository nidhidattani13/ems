import { useAuth } from "../context/AuthContext";
import "../styles/Dashboard.css";
import { useState, useEffect, useMemo } from "react";
import DepartmentsManager from "../components/DepartmentsManager";
import DesignationsManager from "../components/DesignationsManager";
import EmployeesManager from "../components/EmployeesManager";
import LeaveTypesManager from "../components/LeaveTypesManager";
import LeavePoliciesManager from "../components/LeavePoliciesManager";
import ApplyLeave from "../components/ApplyLeave";
import LeaveRequestsAdmin from "../components/LeaveRequestsAdmin";
import TeamLeaveRequests from "../components/TeamLeaveRequests";
import EmployeeAttendance from "../components/EmployeeAttendance";
import AdminAttendance from "../components/AdminAttendance";
import EmployeeProfile from "../components/EmployeeProfile";
import FaceEnroll from "../components/FaceEnroll";
import { Home, Building2, Users, CalendarCheck, ClipboardList, FilePlus, FileText, Briefcase, Layers, LogOut as LogOutIcon, Settings, CheckCircle, Clock, Shield, TrendingUp, Award, Activity, Menu, X, Bell, Search, Filter, Download, Plus, BarChart3, PieChart } from "lucide-react";
import { employeesService } from "../services/employeesService";
import { departmentsService } from "../services/departmentsService";
import { leaveRequestsService } from "../services/leaveRequestsService";
import { attendanceService } from "../services/attendanceService";

const Dashboard = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  // Overview live data
  const [empList, setEmpList] = useState([]);
  const [deptList, setDeptList] = useState([]);
  const [leaveReqs, setLeaveReqs] = useState([]);
  const [attMonth, setAttMonth] = useState([]); // current month
  const [attPrevMonth, setAttPrevMonth] = useState([]); // previous month
  const [loadingOverview, setLoadingOverview] = useState(false);
  // Employee-side data
  const [myEmp, setMyEmp] = useState(null);
  const [myToday, setMyToday] = useState(null);
  const [myReqs, setMyReqs] = useState([]);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const handleNavClick = (key) => {
    setActiveTab(key);
    if (window?.innerWidth <= 768) setMobileOpen(false);
  };

  useEffect(() => {
    if (!isAdmin) return; // only admin can fetch these
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const load = async () => {
      try {
        setLoadingOverview(true);
        const [emps, depts, reqs, att1, att2] = await Promise.all([
          employeesService.list().catch(() => []),
          departmentsService.list().catch(() => []),
          leaveRequestsService.list().catch(() => []),
          attendanceService.listAll({ month, year }).catch(() => []),
          attendanceService.listAll({ month: prevMonth, year: prevYear }).catch(() => []),
        ]);
        setEmpList(Array.isArray(emps) ? emps : []);
        setDeptList(Array.isArray(depts) ? depts : []);
        setLeaveReqs(Array.isArray(reqs) ? reqs : []);
        setAttMonth(Array.isArray(att1) ? att1 : []);
        setAttPrevMonth(Array.isArray(att2) ? att2 : []);
      } finally {
        setLoadingOverview(false);
      }
    };
    load();
  }, [isAdmin]);

  // Employee-side load
  useEffect(() => {
    if (isAdmin) return;
    const loadMine = async () => {
      try {
        setLoadingOverview(true);
        const [emp, today, reqs] = await Promise.all([
          user?.id ? employeesService.get(user.id).catch(() => null) : Promise.resolve(null),
          attendanceService.getToday().catch(() => null),
          leaveRequestsService.list().catch(() => []),
        ]);
        setMyEmp(emp);
        setMyToday(today);
        const mine = Array.isArray(reqs) ? reqs.filter(r => String(r.employee_id) === String(user?.id)) : [];
        mine.sort((a,b) => (b.id || 0) - (a.id || 0));
        setMyReqs(mine.slice(0,4));
      } finally {
        setLoadingOverview(false);
      }
    };
    loadMine();
  }, [isAdmin, user?.id]);

  const overviewStats = useMemo(() => {
    const totalEmployees = empList.length;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const allAtt = [...attMonth, ...attPrevMonth];
    const presentToday = allAtt.filter(r => r.date === todayStr && r.sign_in_time).length;

    const normalize = (s) => String(s || '').toLowerCase();
    const pendingRequests = leaveReqs.filter(r => normalize(r.leave_status) === 'pending').length;

    // on leave today: approved requests overlapping today
    const onLeave = leaveReqs.filter(r => {
      const ls = normalize(r.leave_status);
      if (ls !== 'approved') return false;
      const sd = new Date(r.start_date);
      const ed = new Date(r.end_date);
      return sd <= today && ed >= today;
    }).length;

    return { totalEmployees, presentToday, onLeave, pendingRequests };
  }, [empList, leaveReqs, attMonth, attPrevMonth]);

  const formatDateDMY = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  };

  const recentRequests = useMemo(() => {
    const list = Array.isArray(leaveReqs) ? [...leaveReqs] : [];
    list.sort((a,b) => (b.id || 0) - (a.id || 0));
    return list.slice(0,4).map((r) => ({
      id: r.id,
      name: r.employee?.name || `Emp #${r.employee_id}`,
      type: r.leaveType?.name || 'Leave',
      date: `${formatDateDMY(r.start_date)} - ${formatDateDMY(r.end_date)}`,
      status: String(r.leave_status || '').toLowerCase() || 'pending',
      avatar: (r.employee?.name || 'NA').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
    }));
  }, [leaveReqs]);

  const deptDistribution = useMemo(() => {
    const counts = new Map();
    for (const e of empList) {
      const id = e.department_id;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    const total = empList.length || 1;
    const colorCycle = ['blue','green','purple','orange','red'];
    return deptList.map((d, i) => ({
      name: d.name,
      employees: counts.get(d.id) || 0,
      percentage: Math.round(((counts.get(d.id) || 0) / total) * 100),
      color: colorCycle[i % colorCycle.length],
    }));
  }, [empList, deptList]);

  const weeklyAttendance = useMemo(() => {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const values = [];
    const total = empList.length || 1;
    const allAtt = [...attMonth, ...attPrevMonth];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      const present = allAtt.filter(r => r.date === key && r.sign_in_time).length;
      values.push(Math.round((present / total) * 100));
    }
    return { days, values };
  }, [empList, attMonth, attPrevMonth]);

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-mobile-head">
            <button className="hamburger close" onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
            <div className="app-chip">EMS</div>
          </div>
          <div className="sidebar-logo-top">
            <img src="/EMS-icon.png" alt="EMS" />
          </div>
        </div>

        <nav className="sidebar-nav">
          {isAdmin ? (
            <>
              {[
                { key: "overview", icon: Home, label: "Dashboard" },
                { key: "departments", icon: Building2, label: "Departments" },
                { key: "designations", icon: Briefcase, label: "Designations" },
                { key: "employees", icon: Users, label: "Employees" },
                { key: "attendance", icon: CalendarCheck, label: "Attendance" },
                { key: "leave-requests", icon: ClipboardList, label: "Leave Requests" },
                { key: "leave-types", icon: Layers, label: "Leave Types" },
                { key: "policies", icon: FileText, label: "Leave Policies" },
              ].map((item) => (
                <button
                  key={item.key}
                  className={`btn-tab ${activeTab === item.key ? "active" : ""}`}
                  onClick={() => handleNavClick(item.key)}
                >
                  <item.icon size={18} style={{ marginRight: 8 }} />
                  {item.label}
                </button>
              ))}
           
              <button onClick={handleLogout} className="logout-btn">
                <LogOutIcon size={18} style={{marginRight:8}} /> Logout
              </button>
            </>
          ) : (
            <>
              {[
                { key: "overview", icon: Home, label: "Overview" },
                { key: "profile", icon: Users, label: "My Profile" },
                { key: "attendance", icon: CalendarCheck, label: "Attendance" },
                { key: "apply-leave", icon: FilePlus, label: "Apply Leave" },
                { key: "team-leave-requests", icon: ClipboardList, label: "Leave Requests" },
              ].map((item) => (
                <button
                  key={item.key}
                  className={`btn-tab ${activeTab === item.key ? "active" : ""}`}
                  onClick={() => handleNavClick(item.key)}
                >
                  <item.icon size={18} style={{ marginRight: 8 }} />
                  {item.label}
                </button>
              ))}
     
              <button onClick={handleLogout} className="logout-btn">
                <LogOutIcon size={18} style={{marginRight:8}} /> Logout
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Main content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="mobile-toggle">
            <button className="hamburger" onClick={() => setMobileOpen((s) => !s)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          {/* <h1>Employee Management System</h1> */}
        </header>

        {activeTab === "overview" && (
          <section className="pro-overview">
            <div className="pro-top-hero">
              <div className="pro-hero-left">
                <h2>Welcome back, {user?.name}</h2>
                <p>{isAdmin ? "Here's your team overview for today" : "Here's your summary for today"}</p>
              </div>
              {isAdmin ? (
                <div className="pro-hero-badge"><Shield size={18} /><span>Admin Access</span></div>
              ) : (
                <div className="pro-hero-badge"><Users size={18} /><span>Employee</span></div>
              )}
            </div>

            {isAdmin ? (
            <div className="pro-stats-grid">
              {[
                { label: 'Total Employees', value: String(overviewStats.totalEmployees || 0), change: '', trend: 'up', icon: Users, color: 'blue' },
                { label: 'Present Today', value: String(overviewStats.presentToday || 0), change: '', trend: 'up', icon: CheckCircle, color: 'green' },
                { label: 'On Leave', value: String(overviewStats.onLeave || 0), change: '', trend: 'down', icon: CalendarCheck, color: 'orange' },
                { label: 'Pending Requests', value: String(overviewStats.pendingRequests || 0), change: '', trend: 'up', icon: Clock, color: 'red' },
              ].map((stat, idx) => (
                <div key={idx} className={`pro-card pro-stat ${stat.color}`}>
                  <div className="pro-stat-head">
                    <div className={`pro-icon ${stat.color}`}>
                      <stat.icon size={22} />
                    </div>
                    {stat.change ? <span className={`pro-trend ${stat.trend}`}>{stat.change}</span> : <span />}
                  </div>
                  <p className="pro-stat-label">{stat.label}</p>
                  <p className="pro-stat-value">{stat.value}</p>
                </div>
              ))}
            </div>
            ) : (
            <div className="pro-grid-2">
              <div className="pro-card">
                <div className="pro-card-head"><h3>My Profile</h3></div>
                <div className="pro-list">
                  <div className="pro-mini"><span className="pro-li-title">Name</span><span className="pro-li-sub">{myEmp?.name || user?.name}</span></div>
                  <div className="pro-mini"><span className="pro-li-title">Email</span><span className="pro-li-sub">{myEmp?.email || user?.email}</span></div>
                  <div className="pro-mini"><span className="pro-li-title">Department</span><span className="pro-li-sub">{myEmp?.department?.name || '—'}</span></div>
                  <div className="pro-mini"><span className="pro-li-title">Designation</span><span className="pro-li-sub">{myEmp?.designation?.title || '—'}</span></div>
                  {/* <div className="pro-mini"><span className="pro-li-title">Status</span><span className="pro-li-sub">{myEmp?.status || '—'}</span></div> */}
                </div>
              </div>
              <div className="pro-card">
                <div className="pro-card-head"><h3>Today's Attendance</h3></div>
                <div className="pro-list">
                  <div className="pro-mini"><span className="pro-li-title">Date</span><span className="pro-li-sub">{formatDateDMY(myToday?.date)}</span></div>
                  <div className="pro-mini"><span className="pro-li-title">Sign In</span><span className="pro-li-sub">{myToday?.sign_in_time || '—'}</span></div>
                  <div className="pro-mini"><span className="pro-li-title">Sign Out</span><span className="pro-li-sub">{myToday?.sign_out_time || '—'}</span></div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <FaceEnroll employeeId={user?.id} name={user?.name} />
                </div>
              </div>
            </div>
            )}

            {isAdmin && (
            <div className="pro-quick-actions">
              {[
                // { icon: Plus, label: 'Add Employee', color: 'blue' },
                // { icon: FileText, label: 'New Leave Policy', color: 'purple' },
                // { icon: Download, label: 'Export Report', color: 'green' },
                // { icon: Bell, label: 'Send Announcement', color: 'orange' },
              ].map((action, idx) => (
                <button key={idx} className={`pro-action ${action.color}`}>
                  <div className={`pro-action-icon ${action.color}`}>
                    <action.icon size={18} />
                  </div>
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
            )}

            {isAdmin && (
            <div className="pro-grid-5">
              <div className="pro-card pro-span-2">
                <div className="pro-card-head">
                  <h3>Recent Leave Requests</h3>
                  <button className="pro-link">View All</button>
                </div>
                <div className="pro-list">
                  {(loadingOverview ? [] : recentRequests).map((req) => (
                    <div key={req.id} className="pro-list-item">
                      <div className="pro-avatar">{req.avatar}</div>
                      <div className="pro-li-main">
                        <p className="pro-li-title">{req.name}</p>
                        <p className="pro-li-sub">{req.type} • {req.date}</p>
                      </div>
                      <div className="pro-li-actions">
                        <span className={`pro-badge ${req.status === 'pending' ? 'warn' : 'ok'}`}>{req.status}</span>
                        {req.status === 'pending' && (
                          <div className="pro-li-btns">
                            <button className="ok"><CheckCircle size={16} /></button>
                            <button className="danger"><X size={16} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!loadingOverview && recentRequests.length === 0 && (
                    <div className="center" style={{padding:12}}>No recent leave requests</div>
                  )}
                </div>
              </div>
              {/* <div className="pro-card">
                <div className="pro-card-head">
                  <h3>Upcoming Birthdays</h3>
                  <Award className="pro-icon-plain" size={20} />
                </div>
                <div className="pro-list">
                  {[
                    { name: 'Alex Turner', date: 'Nov 2', department: 'Engineering', avatar: 'AT' },
                    { name: 'Maria Garcia', date: 'Nov 5', department: 'HR', avatar: 'MG' },
                    { name: 'David Kim', date: 'Nov 8', department: 'Marketing', avatar: 'DK' },
                  ].map((p, i) => (
                    <div key={i} className="pro-mini">
                      <div className="pro-avatar small">{p.avatar}</div>
                      <div className="pro-mini-main">
                        <p className="pro-li-title">{p.name}</p>
                        <p className="pro-li-sub">{p.department}</p>
                      </div>
                      <span className="pro-date">{p.date}</span>
                    </div>
                  ))}
                </div>
              </div> */}
            </div>
            )}

            {isAdmin && (
            <div className="pro-grid-2">
              <div className="pro-card">
                <div className="pro-card-head">
                  <h3>Weekly Attendance</h3>
                  <Filter className="pro-icon-plain" size={18} />
                </div>
                <div className="pro-bars">
                  {weeklyAttendance.days.map((day, idx) => (
                    <div key={idx} className="pro-bar-col">
                      <div className="pro-bar" style={{height: `${weeklyAttendance.values[idx] || 0}%`}} />
                      <span className="pro-bar-label">{day}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pro-card">
                <h3 className="pro-card-title">Department Distribution</h3>
                <div className="pro-dept-list">
                  {(loadingOverview ? [] : deptDistribution).map((d, idx) => (
                    <div key={idx} className="pro-dept-item">
                      <div className="pro-dept-meta">
                        <span className="pro-li-title">{d.name}</span>
                        <span className="pro-li-sub">{d.employees} employees</span>
                      </div>
                      <div className="pro-progress">
                        <div className={`pro-progress-fill ${d.color}`} style={{width: `${d.percentage}%`}} />
                      </div>
                    </div>
                  ))}
                  {!loadingOverview && deptDistribution.length === 0 && (
                    <div className="center" style={{padding:12}}>No departments</div>
                  )}
                </div>
              </div>
            </div>
            )}
          </section>
        )}

        {activeTab === "departments" && (
          <section className="dashboard-section">
            <DepartmentsManager />
          </section>
        )}

        {activeTab === "designations" && (
          <section className="dashboard-section">
            <DesignationsManager />
          </section>
        )}

        {activeTab === "employees" && (
          <section className="dashboard-section">
            <EmployeesManager />
          </section>
        )}

        {activeTab === "attendance" && (
          <section className="dashboard-section">
            {isAdmin ? (
              <AdminAttendance />
            ) : (
              <EmployeeAttendance />
            )}
          </section>
        )}

        {activeTab === "leave-types" && (
          <section className="dashboard-section">
            <LeaveTypesManager />
          </section>
        )}

        {activeTab === "policies" && (
          <section className="dashboard-section">
            <LeavePoliciesManager />
          </section>
        )}

        {activeTab === "leaves" && (
          <section className="dashboard-section">
            <ApplyLeave />
          </section>
        )}

        {activeTab === "leave-requests" && (
          <section className="dashboard-section">
            <ApplyLeave />
          </section>
        )}

        {activeTab === "apply-leave" && (
          <section className="dashboard-section">
            <ApplyLeave />
          </section>
        )}

        {!isAdmin && activeTab === "team-leave-requests" && (
          <section className="dashboard-section">
            <TeamLeaveRequests />
          </section>
        )}

        {!isAdmin && activeTab === "profile" && (
          <section className="dashboard-section">
            <EmployeeProfile />
          </section>
        )}

        {activeTab !== "overview" && activeTab !== "departments" && activeTab !== "designations" && activeTab !== "employees" && activeTab !== "leave-types" && activeTab !== "policies" && activeTab !== "leaves" && activeTab !== "leave-requests" && activeTab !== "apply-leave" && activeTab !== "attendance" && activeTab !== "profile" && activeTab !== "team-leave-requests" && (
          <section className="dashboard-section">
            <h2 className="section-title">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <p className="placeholder-text">
            </p>
          </section>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
