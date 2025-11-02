const express = require('express');
const router = express.Router();
const db = require('../../db');
const bcrypt = require('bcrypt');

router.post('/', async (req, res) => {
    const { userid, password, username, roomnumber } = req.body;

    // --- 1. 서버 측 유효성 검사 ---

    // 필수 정보 확인
    if (!userid || !password || !username || !roomnumber) {
        return res.status(400).send('모든 필드를 입력해주세요.');
    }

    // 호실 번호 검사 (401 ~ 418)
    const roomNum = parseInt(roomnumber, 10);
    if (isNaN(roomNum) || roomNum < 401 || roomNum > 418) {
        return res.status(400).send('호실 번호는 401부터 418 사이여야 합니다.');
    }

    // 아이디 검사: 4~15자, 영문 소문자, 숫자만
    const useridRegex = /^[a-z0-9]{4,15}$/;
    if (!useridRegex.test(userid)) {
        return res.status(400).send('아이디는 4~15자의 영문 소문자와 숫자만 사용할 수 있습니다.');
    }

    // 비밀번호 검사: 8~20자, 대/소문자, 숫자, 특수문자(!@#$%^&*) 각 1개 이상 포함
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).send('비밀번호는 8~20자 길이로, 영문 대/소문자, 숫자, 특수문자(!@#$%^&*)를 각각 하나 이상 포함해야 합니다.');
    }

    // 이름 검사: 2~5자, 한글만
    const usernameRegex = /^[가-힣]{2,5}$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).send('이름은 2~5자의 한글만 사용할 수 있습니다.');
    }

    // --- 2. 중복 검사 (아이디, 호실) ---
    try {
        // 2-1. 아이디 중복 검사
        const checkIdQuery = 'SELECT userid FROM information WHERE userid = ?';
        const [idResults] = await db.query(checkIdQuery, [userid]);
        if (idResults.length > 0) {
            return res.status(409).send('이미 사용 중인 아이디입니다.');
        }

        // 2-2. 호실 인원 수 검사 (최대 4명)
        const checkRoomQuery = 'SELECT COUNT(*) as count FROM information WHERE roomnumber = ?';
        const [roomResults] = await db.query(checkRoomQuery, [roomnumber]);
        const roomCount = roomResults[0].count;
        if (roomCount >= 4) {
            return res.status(409).send('해당 호실은 정원(4명)이 모두 등록되어 더 이상 등록할 수 없습니다.');
        }

        // --- 3. 비밀번호 암호화 및 사용자 등록 ---
        const hashedPassword = await bcrypt.hash(password, 10);
        // 아이디가 'teacher_id'이면 'teacher' 역할을, 아니면 'student' 역할을 부여
        const role = (userid === 'teacher') ? 'teacher' : 'student';
        const insertUserQuery = 'INSERT INTO information (userid, password, username, roomnumber, role) VALUES (?, ?, ?, ?, ?)';
        await db.query(insertUserQuery, [userid, hashedPassword, username, roomnumber, role]);
        res.status(200).send('success');
    } catch (error) {
        console.error('회원가입 처리 중 오류:', error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});

module.exports = router;
