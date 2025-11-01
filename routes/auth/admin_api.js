const express = require('express');
const router = express.Router();
const db = require('../../db');

// 접근 제어 미들웨어 (이 라우터 전체에 적용)
router.use((req, res, next) => {
    if (req.session.user && req.session.user.role === 'teacher') {
        next();
    } else {
        res.status(403).send('권한이 없습니다.');
    }
});

// 모든 학생 목록 조회 API
router.get('/students', (req, res) => {
    const query = "SELECT userid, username, roomnumber FROM information WHERE role = 'student'";
    db.query(query, (err, results) => {
        if (err) {
            console.error('학생 목록 조회 오류:', err);
            return res.status(500).send('서버 오류가 발생했습니다.');
        }
        res.json(results);
    });
});

// 특정 학생 삭제 API
router.delete('/students/:id', (req, res) => {
    const studentId = req.params.id;
    const query = "DELETE FROM information WHERE userid = ? AND role = 'student'";
    db.query(query, [studentId], (err, result) => {
        if (err) {
            return res.status(500).send('학생 삭제 중 오류가 발생했습니다.');
        }
        res.status(200).send('학생이 성공적으로 삭제되었습니다.');
    });
});

module.exports = router;