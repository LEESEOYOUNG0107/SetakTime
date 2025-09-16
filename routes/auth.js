const express = require('express');
const router = express.Router(); // 라우터 객체 생성
const path = require('path');

// GET 요청: 회원가입 페이지를 보여줌
router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../../views/signup.html'));
});

// POST 요청: 회원가입 데이터 처리
router.post('/signup', (req, res) => {
  // 여기서 회원가입 로직을 처리합니다 (예: 데이터베이스에 저장)
  console.log(req.body); 
  res.send('회원가입이 완료되었습니다.');
});

module.exports = router;