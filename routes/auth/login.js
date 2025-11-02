const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../../db');
const bcrypt = require('bcrypt');

// POST 요청: 로그인 처리
router.post('/', async (req, res) => {
    const { userid, password } = req.body;

    try {
        // 1. 아이디로 사용자 정보(해시된 비밀번호 포함)를 가져옵니다.
        const sql = 'SELECT userid, password, username, role, roomnumber FROM information WHERE userid = ?';
        const [results] = await db.query(sql, [userid]);

        const user = results[0];
        if (!user) {
            // 사용자가 존재하지 않으면
            return res.status(401).send('아이디 또는 비밀번호가 일치하지 않습니다.');
        }

        // 2. 입력된 비밀번호와 DB의 해시된 비밀번호를 비교합니다.
        const isMatch = await bcrypt.compare(password, user.password);

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
    } catch (error) {
        console.error('로그인 처리 중 오류:', error);
        return res.status(500).send('로그인 처리 중 서버 오류가 발생했습니다.');
    }
});


module.exports = router;
