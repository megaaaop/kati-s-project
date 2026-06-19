// สถิติการลา (เฟส 5) — รวมยอดตามขอบเขตของผู้ใช้
const userModel = require('../models/user.model');
const requestModel = require('../models/request.model');

function getStats(req, res, next) {
  try {
    const user = userModel.findById(req.user.id);
    const rows = requestModel.statsRows(user);

    const byStatus = { pending: 0, approved: 0, rejected: 0 };
    const byType = { sick: 0, personal: 0, activity: 0 };
    const byMonth = {};
    const byGrade = {};
    const byStudent = {};

    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byType[r.leave_type] = (byType[r.leave_type] || 0) + 1;
      const m = (r.created_at || '').slice(0, 7); // YYYY-MM
      if (m) byMonth[m] = (byMonth[m] || 0) + 1;
      const g = r.grade_level || 'ไม่ระบุ';
      byGrade[g] = (byGrade[g] || 0) + 1;
      const key = (r.student_code || '') + '|' + (r.student_name || '');
      if (!byStudent[key]) byStudent[key] = { name: r.student_name, student_id: r.student_code, count: 0 };
      byStudent[key].count++;
    }

    return res.json({
      total: rows.length,
      byStatus,
      byType,
      byMonth: Object.keys(byMonth).sort().map((m) => ({ month: m, count: byMonth[m] })),
      byGrade: Object.keys(byGrade).sort().map((g) => ({ grade: g, count: byGrade[g] })),
      topStudents: Object.values(byStudent).sort((a, b) => b.count - a.count).slice(0, 10),
    });
  } catch (e) { next(e); }
}

module.exports = { getStats };
