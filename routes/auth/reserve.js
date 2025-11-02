const express = require('express');
const router = express.Router();
const db = require('../../db'); // db.js 파일 불러오기

// 남은 세탁기 조회 API
router.get('/available', (req, res) => {
    // 클라이언트에서 조회하려는 날짜와 시간을 쿼리 파라미터로 받습니다.
    const { reservationDate, reservationTime } = req.query;

    if (!reservationDate || !reservationTime) {
        return res.status(400).json({ error: '날짜와 시간을 모두 제공해야 합니다.' });
    }

    // 이미 예약된 세탁기를 제외하고 남은 세탁기를 조회
    const query = 'SELECT * FROM washer WHERE washer_id NOT IN (SELECT washer_id FROM reservations WHERE reservation_date = ? AND reservation_time = ?)';

    db.query(query, [reservationDate, reservationTime], (err, results) => {
        if (err) {
            console.error('남은 세탁기 조회 오류:', err);
            return res.status(500).json({ error: '조회 중 서버 오류가 발생했습니다.' });
        }
        res.status(200).json(results);
    });
});

router.post('/create', (req, res) => {
    // 세션에서 사용자 ID 가져오기
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    const userId = req.session.user.id;
    const roomNumber = req.session.user.roomnumber;

    // 클라이언트(Thunder Client)가 보낸 요청의 본문(Body)에서 데이터를 가져옴.
    const {washerId, reservationDate, reservationTime} = req.body; 

    if (!washerId || !reservationDate || !reservationTime || !roomNumber) {
        return res.status(400).send('필수 정보가 누락되었습니다.');
    }

    // 1. 동일한 호실이 오늘 이미 예약했는지 확인
    const checkRoomQuery = `
        SELECT r.id FROM reservations r
        JOIN information u ON r.userid = u.userid
        WHERE u.roomnumber = ? AND r.reservation_date = ?
    `;
    db.query(checkRoomQuery, [roomNumber, reservationDate], (err, roomResults) => {
        if (err) {
            console.error('호실 중복 예약 확인 중 오류 발생:', err);
            return res.status(500).send('서버 오류가 발생했습니다.');
        }
        if (roomResults.length > 0) {
            return res.status(409).send('이미 본인 호실에서 오늘 예약을 완료했습니다.');
        }

        // 2. 동일한 세탁기, 날짜, 시간에 이미 예약이 있는지 db에서 조회
        const checkSlotQuery = 'SELECT id FROM reservations WHERE washer_id=? AND reservation_date=? AND reservation_time=?';
        db.query(checkSlotQuery, [washerId, reservationDate, reservationTime], (err, slotResults) => {
            if (err) {
                console.error('슬롯 중복 예약 확인 중 오류 발생:', err);
                return res.status(500).send('서버 오류가 발생했습니다.');
            }
            if (slotResults.length > 0) {
                return res.status(409).send('이미 다른 사람이 예약한 시간입니다.');
            }

            // 3. 예약 생성
            const insertQuery = 'INSERT INTO reservations (userid, washer_id, reservation_date, reservation_time) VALUES (?,?,?,?)';
            db.query(insertQuery, [userId, washerId, reservationDate, reservationTime], (err, result) => {
                if (err) {
                    console.error('예약 생성 중 오류 발생:', err);
                    return res.status(500).send('예약 생성 중 서버 오류가 발생했습니다.');
                }
                res.status(201).json({ message: '예약이 성공적으로 완료되었습니다.', reservationId: result.insertId });
            });
        });
    });
});



router.get('/washer/:washerId', (req, res) => {
    const { washerId } = req.params;

    // 현재 날짜의 예약만 가져오기 위해 날짜 필터링 추가
    const today = new Date().toISOString().split('T')[0]; 
    const query = `
        SELECT r.id, r.userid, u.roomnumber, r.washer_id, r.reservation_date, r.reservation_time 
        FROM reservations r
        JOIN information u ON r.userid = u.userid
        WHERE r.washer_id = ? AND r.reservation_date = ? 
        ORDER BY r.reservation_time ASC`;
    db.query(query, [washerId, today], (err, results) => {
        if (err) {
            console.error('세탁기 예약 조회 오류:', err);
            return res.status(500).json({ message: '세탁기 예약 목록을 불러오는 중 오류가 발생했습니다.' });
        }
        res.status(200).json(results);
    });
});

// 나의 오늘 예약 현황 조회 API
router.get('/my-reservations/today', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
    }
    const userId = req.session.user.id;
    const today = new Date().toISOString().split('T')[0];

    const query = 'SELECT id, washer_id, reservation_time FROM reservations WHERE userid = ? AND reservation_date = ? ORDER BY reservation_time ASC';

    db.query(query, [userId, today], (err, results) => {
        if (err) {
            console.error('나의 오늘 예약 현황 조회 중 오류 발생:', err);
            return res.status(500).send('예약 확인 중 서버 오류가 발생했습니다.');
        }
        res.status(200).json(results);
    });
});

//예약수정
router.patch('/update/:id', (req, res) => {
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
    
    // 예약 소유권 확인: 해당 예약이 요청한 사용자의 것인지 확인
    const checkOwnQuery = 'SELECT * FROM reservations WHERE id = ? AND userid = ?';
    db.query(checkOwnQuery, [reservationId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).send('수정 권한이 없거나 예약이 존재하지 않습니다.');
        }
        //중복예약방지
        const checkquery = 'SELECT * FROM reservations WHERE washer_id = ? AND reservation_date = ? AND reservation_time = ? AND id != ?';
        db.query(checkquery, [washerId, reservationDate, reservationTime, reservationId], (err, duplicateResult) => {
            if(err){
                console.error('중복 예약 확인 중 오류 발생', err);
                return res.status(500).send('중복 얘약 오류가 발생했습니다.');
            }
            if (duplicateResult.length > 0) {
                return res.status(409).send('변경하려는 시간에 이미 다른 예약이 있습니다.');
            }
        

            // 예약 정보 수정
            const updateQuery = 'UPDATE reservations SET washer_id = ?, reservation_date = ?, reservation_time = ? WHERE id = ?';
            db.query(updateQuery, [washerId, reservationDate, reservationTime, reservationId], (err, result) => {
                if (err) {
                    console.error('예약 수정 중 오류 발생:', err);
                    return res.status(500).send('예약 수정 중 서버 오류가 발생했습니다.');
                }
                res.status(200).json({ message: '예약이 성공적으로 수정되었습니다.' });
            });
        });
    });
});

// 예약 취소
router.delete('/cancel/:id', (req, res) => {
    const reservationId = req.params.id;
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    const userId = req.session.user.id;
    const roomNumber = req.session.user.roomnumber;

    // 예약 소유권 확인: 예약을 직접 한 사람이거나, 같은 호실의 사람인지 확인
    const checkOwnershipQuery = `
        SELECT r.id, u.roomnumber 
        FROM reservations r
        JOIN information u ON r.userid = u.userid
        WHERE r.id = ?
    `;
    db.query(checkOwnershipQuery, [reservationId], (err, results) => {
        if (err) {
            return res.status(500).send('예약 소유권 확인 중 오류가 발생했습니다.');
        }
        if (results.length === 0) {
            return res.status(404).send('취소하려는 예약이 존재하지 않습니다.');
        }

        const reservation = results[0];
        // 권한 확인: 예약을 한 사람의 호실과 현재 요청자의 호실이 다르면 권한 없음
        if (reservation.roomnumber.toString() !== roomNumber.toString()) {
            return res.status(403).send('이 예약을 취소할 권한이 없습니다.');
        }


        // 예약 삭제
        const deleteQuery = 'DELETE FROM reservations WHERE id = ?';
        db.query(deleteQuery, [reservationId], (err, result) => {
            if (err) {
                console.error('예약 취소 중 오류 발생', err);
                return res.status(500).send('예약 취소 중 서버 오류');
            }
            res.status(200).json({ message: '예약이 성공적으로 취소되었습니다.' });
        });
    });
});

module.exports = router;