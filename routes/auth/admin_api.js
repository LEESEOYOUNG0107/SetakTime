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
router.get('/students', async (req, res) => {
    try {
        const query = `
            SELECT userid, username, roomnumber, is_suspended, suspension_end_date
            FROM information 
            WHERE role = 'student' 
            AND userid IS NOT NULL AND userid != ''
            AND username IS NOT NULL AND username != ''`;
        const [results] = await db.query(query);
        res.json(results);
    } catch (error) {
        console.error('학생 목록 조회 오류:', error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});

// 특정 학생 삭제 API
router.delete('/students/:id', async (req, res) => {
    const studentId = req.params.id;
    try {
        const query = "DELETE FROM information WHERE userid = ? AND role = 'student'";
        await db.query(query, [studentId]);
        res.status(200).send('학생이 성공적으로 삭제되었습니다.');
    } catch (error) {
        console.error('학생 삭제 중 오류:', error);
        res.status(500).send('학생 삭제 중 오류가 발생했습니다.');
    }
});

// 학생 계정 정지 API
router.post('/students/:id/suspend', async (req, res) => {
    const studentId = req.params.id;
    const { days } = req.body;

    if (!days || isNaN(parseInt(days)) || parseInt(days) <= 0) {
        return res.status(400).send('정지일수는 1 이상의 숫자여야 합니다.');
    }

    try {
        const suspensionEndDate = new Date();
        suspensionEndDate.setDate(suspensionEndDate.getDate() + parseInt(days));

        const query = "UPDATE information SET is_suspended = TRUE, suspension_end_date = ? WHERE userid = ? AND role = 'student'";
        await db.query(query, [suspensionEndDate, studentId]);

        res.status(200).send(`${studentId} 학생을 ${days}일 동안 정지 처리했습니다.`);
    } catch (error) {
        console.error('학생 정지 처리 중 오류:', error);
        res.status(500).send('학생 정지 처리 중 오류가 발생했습니다.');
    }
});
// --- 예약 불가 날짜 관리 API ---

// 모든 '예약 불가' 날짜 조회
router.get('/disabled-dates', async (req, res) => {
    try {
        const query = "SELECT disabled_date FROM disabled_dates";
        const [results] = await db.query(query);
        // 시간대 문제 방지를 위해, DB에서 가져온 Date 객체를 KST 기준으로 'YYYY-MM-DD' 문자열로 변환합니다.
        const dates = results.map(row => {
            const d = new Date(row.disabled_date);
            return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        });
        res.json(dates);
    } catch (error) {
        console.error('예약 불가 날짜 조회 오류:', error);
        res.status(500).send('서버 오류');
    }
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