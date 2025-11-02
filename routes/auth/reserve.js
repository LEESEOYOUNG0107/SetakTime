const express = require('express');
const router = express.Router();
const db = require('../../db'); // db.js 파일 불러오기

// 호실별 고정 예약 스케줄 정의
const fixedReservations = {
    // --- 월요일 (Monday) ---
    '401': { day: 1, time: '20:10:00', washer_id: 1 },
    '402': { day: 1, time: '20:10:00', washer_id: 2 },
    '403': { day: 1, time: '20:10:00', washer_id: 3 },
    '404': { day: 1, time: '21:20:00', washer_id: 2 },
    '414': { day: 1, time: '21:20:00', washer_id: 3 },
  
    // --- 화요일 (Tuesday) ---
    '405': { day: 2, time: '20:10:00', washer_id: 1 },
    '406': { day: 2, time: '20:10:00', washer_id: 2 },
    '407': { day: 2, time: '20:10:00', washer_id: 3 },
    '408': { day: 2, time: '21:20:00', washer_id: 1 },
    '415': { day: 2, time: '21:20:00', washer_id: 3 },
  
    // --- 수요일 (Wednesday) ---
    '409': { day: 3, time: '20:10:00', washer_id: 1 },
    '419': { day: 3, time: '20:10:00', washer_id: 2 },
    '411': { day: 3, time: '20:10:00', washer_id: 3 },
    '412': { day: 3, time: '21:20:00', washer_id: 1 },
    '416': { day: 3, time: '21:20:00', washer_id: 2 },
  
    // --- 목요일 (Thursday) ---
    '413': { day: 4, time: '20:10:00', washer_id: 1 },
    '417': { day: 4, time: '20:10:00', washer_id: 2 },
    '418': { day: 4, time: '20:10:00', washer_id: 3 },

    // --- 일요일 (Sunday) ---
    '420': { day: 0, time: '18:00:00', washer_id: 1 },
    '421': { day: 0, time: '18:00:00', washer_id: 2 }
};

// 모든 사용자가 '예약 불가' 날짜를 조회할 수 있는 API
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

// 남은 세탁기 조회 API
router.get('/available', async (req, res) => {
    // 클라이언트에서 조회하려는 날짜와 시간을 쿼리 파라미터로 받습니다.
    const { reservationDate, reservationTime } = req.query;

    if (!reservationDate || !reservationTime) {
        return res.status(400).json({ error: '날짜와 시간을 모두 제공해야 합니다.' });
    }
    try {
        // 이미 예약된 세탁기를 제외하고 남은 세탁기를 조회
        const query = 'SELECT * FROM washer WHERE washer_id NOT IN (SELECT washer_id FROM reservations WHERE reservation_date = ? AND reservation_time = ?)';
        const [results] = await db.query(query, [reservationDate, reservationTime]);
        res.status(200).json(results);
    } catch (error) {
        console.error('남은 세탁기 조회 오류:', error);
        res.status(500).json({ error: '조회 중 서버 오류가 발생했습니다.' });
    }
});

router.post('/create', async (req, res) => {
    // 세션에서 사용자 ID 가져오기
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    const userId = req.session.user.id;
    const roomNumber = req.session.user.roomnumber;
    const {washerId, reservationDate, reservationTime} = req.body; 

    if (!washerId || !reservationDate || !reservationTime || !roomNumber) {
        return res.status(400).send('필수 정보가 누락되었습니다.');
    }

    try {
        // -1. 사용자 정지 상태 확인
        const userQuery = "SELECT is_suspended, suspension_end_date FROM information WHERE userid = ?";
        const [userResults] = await db.query(userQuery, [userId]);
        const user = userResults[0];

        if (user && user.is_suspended) {
            const today = new Date();
            const suspensionEnd = new Date(user.suspension_end_date);
            if (suspensionEnd >= today) {
                return res.status(403).send(`계정이 ${suspensionEnd.toLocaleDateString('ko-KR')}까지 정지되어 예약을 할 수 없습니다.`);
            }
        }

        // 0. 고정 예약이 있는 호실인지 확인
        const reservationDay = new Date(reservationDate + 'T00:00:00').getDay();
        const fixedSchedule = fixedReservations[roomNumber.toString()];
        if (fixedSchedule && fixedSchedule.day === reservationDay) {
            return res.status(403).send('고정 예약이 있는 호실은 추가 예약을 할 수 없습니다.');
        }

        // 0.5. 관리자가 설정한 '예약 불가' 날짜인지 확인
        const checkDisabledDateQuery = "SELECT id FROM disabled_dates WHERE disabled_date = ?";
        const [disabledResults] = await db.query(checkDisabledDateQuery, [reservationDate]);
        if (disabledResults.length > 0) {
            return res.status(403).send('관리자에 의해 예약이 불가능한 날짜입니다.');
        }

        // 1. 동일한 호실이 오늘 이미 예약했는지 확인
        const checkRoomQuery = `
            SELECT r.id FROM reservations r
            JOIN information u ON r.userid = u.userid
            WHERE u.roomnumber = ? AND r.reservation_date = ?
        `;
        const [roomResults] = await db.query(checkRoomQuery, [roomNumber, reservationDate]);
        if (roomResults.length > 0) {
            return res.status(409).send('이미 본인 호실에서 오늘 예약을 완료했습니다.');
        }

        // 2. 동일한 세탁기, 날짜, 시간에 이미 예약이 있는지 db에서 조회
        const checkSlotQuery = 'SELECT id FROM reservations WHERE washer_id=? AND reservation_date=? AND reservation_time=?';
        const [slotResults] = await db.query(checkSlotQuery, [washerId, reservationDate, reservationTime]);
        if (slotResults.length > 0) {
            return res.status(409).send('이미 다른 사람이 예약한 시간입니다.');
        }

        // 3. 예약 생성
        const insertQuery = 'INSERT INTO reservations (userid, washer_id, reservation_date, reservation_time) VALUES (?,?,?,?)';
        const [result] = await db.query(insertQuery, [userId, washerId, reservationDate, reservationTime]);
        res.status(201).json({ message: '예약이 성공적으로 완료되었습니다.', reservationId: result.insertId });

    } catch (error) {
        console.error('예약 생성 중 오류 발생:', error);
        res.status(500).send('예약 생성 중 서버 오류가 발생했습니다.');
    }
});


router.get('/washer/:washerId', async (req, res) => {
    const { washerId } = req.params;

    try {
        // KST 기준 현재 날짜 및 요일 계산
        const todayDate = new Date();
        const offset = todayDate.getTimezoneOffset() * 60000;
        const today = new Date(todayDate.getTime() - offset).toISOString().split('T')[0];
        const dayOfWeek = todayDate.getDay(); // 0:일, 1:월, 2:화, ...

        const query = `
            SELECT r.id, r.userid, u.roomnumber, r.washer_id, r.reservation_date, r.reservation_time 
            FROM reservations r
            JOIN information u ON r.userid = u.userid
            WHERE r.washer_id = ? AND r.reservation_date = ? 
            ORDER BY r.reservation_time ASC`;
        const [results] = await db.query(query, [washerId, today]);

        // 오늘 요일에 해당하는 모든 고정 예약을 찾아서 추가
        for (const roomnumber in fixedReservations) {
            const schedule = fixedReservations[roomnumber];
            if (schedule.day === dayOfWeek && schedule.washer_id.toString() === washerId) {
                results.push({
                    id: `fixed_${roomnumber}_${schedule.day}`, // 예: fixed_401_1
                    userid: 'system',
                    roomnumber: roomnumber,
                    washer_id: schedule.washer_id,
                    reservation_date: today,
                    reservation_time: schedule.time
                });
            }
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('세탁기 예약 조회 오류:', error);
        res.status(500).json({ message: '세탁기 예약 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});

// 나의 오늘 예약 현황 조회 API
router.get('/my-reservations/today', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    const userId = req.session.user.id;
    const today = new Date().toISOString().split('T')[0];
    try {
        const query = 'SELECT id, washer_id, reservation_time FROM reservations WHERE userid = ? AND reservation_date = ? ORDER BY reservation_time ASC';
        const [results] = await db.query(query, [userId, today]);
        res.status(200).json(results);
    } catch (error) {
        console.error('나의 오늘 예약 현황 조회 중 오류 발생:', error);
        res.status(500).send('예약 확인 중 서버 오류가 발생했습니다.');
    }
});

//예약수정
router.patch('/update/:id', async (req, res) => {
    const reservationId = req.params.id; // URL 파라미터에서 예약 ID를 가져옴
    const { washerId, reservationDate, reservationTime } = req.body;
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    const userId = req.session.user.id;

    // 필수 정보 누락 체크
    if (!washerId || !reservationDate || !reservationTime) {
        return res.status(400).send('필수 정보가 누락되었습니다.');
    }
    try {
        // 예약 소유권 확인: 해당 예약이 요청한 사용자의 것인지 확인
        const checkOwnQuery = 'SELECT * FROM reservations WHERE id = ? AND userid = ?';
        const [results] = await db.query(checkOwnQuery, [reservationId, userId]);
        if (results.length === 0) {
            return res.status(403).send('수정 권한이 없거나 예약이 존재하지 않습니다.');
        }

        //중복예약방지
        const checkquery = 'SELECT * FROM reservations WHERE washer_id = ? AND reservation_date = ? AND reservation_time = ? AND id != ?';
        const [duplicateResult] = await db.query(checkquery, [washerId, reservationDate, reservationTime, reservationId]);
        if (duplicateResult.length > 0) {
            return res.status(409).send('변경하려는 시간에 이미 다른 예약이 있습니다.');
        }

        // 예약 정보 수정
        const updateQuery = 'UPDATE reservations SET washer_id = ?, reservation_date = ?, reservation_time = ? WHERE id = ?';
        await db.query(updateQuery, [washerId, reservationDate, reservationTime, reservationId]);
        res.status(200).json({ message: '예약이 성공적으로 수정되었습니다.' });

    } catch (error) {
        console.error('예약 수정 중 오류 발생:', error);
        res.status(500).send('예약 수정 중 서버 오류가 발생했습니다.');
    }
});

// 예약 취소
router.delete('/cancel/:id', async (req, res) => {
    const reservationId = req.params.id;
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    const roomNumber = req.session.user.roomnumber;

    try {
        // 예약 소유권 확인: 예약을 직접 한 사람이거나, 같은 호실의 사람인지 확인
        const checkOwnershipQuery = `
            SELECT r.id, u.roomnumber 
            FROM reservations r
            JOIN information u ON r.userid = u.userid
            WHERE r.id = ?
        `;
        const [results] = await db.query(checkOwnershipQuery, [reservationId]);
        if (results.length === 0) {
            return res.status(404).send('취소하려는 예약이 존재하지 않습니다.');
        }

        const reservation = results[0];
        if (reservation.roomnumber.toString() !== roomNumber.toString()) {
            return res.status(403).send('이 예약을 취소할 권한이 없습니다.');
        }

        // 예약 삭제
        const deleteQuery = 'DELETE FROM reservations WHERE id = ?';
        await db.query(deleteQuery, [reservationId]);
        res.status(200).json({ message: '예약이 성공적으로 취소되었습니다.' });
    } catch (error) {
        console.error('예약 취소 중 오류 발생', error);
        res.status(500).send('예약 취소 중 서버 오류');
    }
});

module.exports = router;