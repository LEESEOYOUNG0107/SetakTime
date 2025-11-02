const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../../db');
const bcrypt = require('bcrypt');

// POST 요청: 로그인 처리
router.post('/', (req, res) => {
    const { userid, password } = req.body;

    // 1. 아이디로 사용자 정보(해시된 비밀번호 포함)를 가져옵니다.
    const sql = 'SELECT userid, password, username, role, roomnumber FROM information WHERE userid = ?';
    db.query(sql, [userid], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('DB 오류가 발생했습니다.');
        }

        const user = result[0];
        if (user) { // 사용자가 존재하면
            // 2. 입력된 비밀번호와 DB의 해시된 비밀번호를 비교합니다.
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error('비밀번호 비교 중 오류:', err);
                    return res.status(500).send('로그인 처리 중 오류가 발생했습니다.');
                }

                if (isMatch) { // 비밀번호가 일치하면
                    // 로그인 성공: 세션에 사용자 정보 저장
                    req.session.user = {
                        id: user.userid,
                        name: user.username,
                        role: user.role,
                        roomnumber: user.roomnumber // 세션에 호실 번호 추가
                    };
                    return res.status(200).json({ message: '로그인 성공', role: user.role });
                } else { // 비밀번호가 일치하지 않으면
                    return res.status(401).send('아이디 또는 비밀번호가 일치하지 않습니다.');
                }
            });
        } else { // 사용자가 존재하지 않으면
            return res.status(401).send('아이디 또는 비밀번호가 일치하지 않습니다.');
        }
    });
});


module.exports = router;
