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
    // 임시 미들웨어에서 가져온 사용자 ID
    const userId = req.user ? req.user.userId : 'temp_user_id';

    // 클라이언트(Thunder Client)가 보낸 요청의 본문(Body)에서 데이터를 가져옴.
    const {washerId, reservationDate, reservationTime} = req.body; 

    // if (!userId) {
    //     return res.status(401).send('로그인 상태가 아닙니다.');
    // }

    if (!washerId || !reservationDate || !reservationTime) {
        return res.status(400).send('필수 정보가 누락되었습니다.');
    }

    //동인한 세탁기, 날짜, 시간에 이미 예약이 있는지 db에서 조회
    const checkquery = 'select*from reservations where washer_id=? and reservation_date=? and reservation_time=?';
    const checkValues = [washerId, reservationDate, reservationTime];

    db.query(checkquery, checkValues, (err, results) => {
        if (err) {
            console.error('중복 예약 확인 중 오류 발생');
            return res.status(500).send('중복 예약 오류');
        }
        if (results.length > 0)
            return res.status(409).send('이미 예약된 시간입니다.');

        // 예약 생성
        const insertquery = 'insert into reservations (userid, washer_id, reservation_date, reservation_time) values (?,?,?,?)';
        const insertValue = [userId, washerId, reservationDate, reservationTime];

        db.query(insertquery, insertValue, (err, result) => {
            if (err) {
                // 예약 생성 중 오류가 발생하면 서버 오류(500)를 보냅니다.
                console.error('예약 생성 중 오류 발생:', err);
                return res.status(500).send('(예약 생성 중 오류)서버 오류');
            }
            res.status(201).json({ message: '예약이 성공적으로 완료되었습니다.', reservationId: result.insertId });
        });
    });
});


router.get('/washer/:washerId', (req, res) => {
    const { washerId } = req.params;

    // 현재 날짜의 예약만 가져오기 위해 날짜 필터링 추가
    const today = new Date().toISOString().split('T')[0]; 
    const query = 'SELECT id, userid, washer_id, reservation_date, reservation_time FROM reservations WHERE washer_id = ? AND reservation_date = ? ORDER BY reservation_time ASC';
    db.query(query, [washerId, today], (err, results) => {
        if (err) {
            console.error('세탁기 예약 조회 오류:', err);
            return res.status(500).json({ message: '세탁기 예약 목록을 불러오는 중 오류가 발생했습니다.' });
        }
        res.status(200).json(results);
    });
});

//나의 예약 현황 조회 API
router.get('/my-reservations', (req, res) => {
    const testId = req.user ? req.user.userId : 'temp_user_id'; //임시 사용자 id 사용
    const query = 'select * from reservations where userid = ? order by reservation_date desc, reservation_time DESC'; //여기부터 시작하기 8/19 조회할 때 날짜순으로 정렬하기
    
    db.query(query, [testId], (err, results) => {
        if(err){
            console.error('나의 예약 현황 조회 중 오류 발생:', err);
            return res.status(500).send('예약확인 중 서버 오류');
        }
        res.status(200).json(results);
    });
});

// 나의 오늘 예약 현황 조회 API
router.get('/my-reservations/today', (req, res) => {
    const userId = req.user ? req.user.userId : 'temp_user_id'; // 임시 사용자 ID
    const today = new Date().toISOString().split('T')[0];

    const query = 'SELECT washer_id, reservation_time FROM reservations WHERE userid = ? AND reservation_date = ? ORDER BY reservation_time ASC';

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
    const userId = req.user ? req.user.userId : 'temp_user_id';

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
    const userId = req.user ? req.user.userId : 'temp_user_id';

    //예약 소유권 확인
    const checkOwnQuery = 'SELECT * FROM reservations WHERE id = ? AND userid = ?';
    db.query(checkOwnQuery, [reservationId, userId], (err, results) => {
        if(err)
            return res.status(500).send('예약 소유권 확인 중 오류가 발생했습니다.');
        if(results.length === 0)
            return res.status(403).send('해당 예약이 존재하지 않습니다.');


        //예약 삭제
        const deleteQuery = 'delete from reservations where id=?';
        db.query(deleteQuery, [reservationId], (err, result) => {
            if(err){
                console.error('예약 취소 중 오류 발생', err);
                return res.status(500).send('예약 취소 중 서버 오류');
            }
            res.status(200).json({message: '예약이 성공적으로 취소되었습니다.'});
        })
    })
})
//9/24백엔드 끝!!
module.exports = router;