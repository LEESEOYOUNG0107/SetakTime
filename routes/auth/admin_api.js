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

// --- 예약 불가 날짜 관리 API ---

// 모든 '예약 불가' 날짜 조회
router.get('/disabled-dates', (req, res) => {
    const query = "SELECT disabled_date FROM disabled_dates";
    db.query(query, (err, results) => {
        if (err) {
            console.error('예약 불가 날짜 조회 오류:', err);
            return res.status(500).send('서버 오류');
        }
        // [ { disabled_date: '2024-01-01' }, ... ] -> [ '2024-01-01', ... ]
        res.json(results.map(row => row.disabled_date.toISOString().split('T')[0]));
    });
});

// '예약 불가' 날짜 상태를 토글(추가/삭제)하는 API
router.post('/disabled-dates/toggle', async (req, res) => {
    const { date } = req.body;
    if (!date) {
        return res.status(400).json({ message: '날짜 정보가 없습니다.' });
    }

    try {
        // 1. 해당 날짜가 이미 DB에 있는지 확인 (Promise 기반으로 변경)
        const checkQuery = "SELECT id FROM disabled_dates WHERE disabled_date = ?";
        const [rows] = await db.query(checkQuery, [date]);

        if (rows.length > 0) {
            // 2-1. 날짜가 존재하면 -> 삭제
            const deleteQuery = "DELETE FROM disabled_dates WHERE disabled_date = ?";
            await db.query(deleteQuery, [date]);
            res.status(200).json({ message: '예약 불가 설정이 취소되었습니다.', action: 'deleted' });
        } else {
            // 2-2. 날짜가 존재하지 않으면 -> 추가
            const insertQuery = "INSERT INTO disabled_dates (disabled_date) VALUES (?)";
            await db.query(insertQuery, [date]);
            res.status(201).json({ message: '예약 불가 날짜로 설정되었습니다.', action: 'created' });
        }
    } catch (error) {
        console.error('예약 불가 날짜 토글 중 오류:', error);
        res.status(500).json({ message: '서버 처리 중 오류가 발생했습니다.' });
    }
});


module.exports = router;