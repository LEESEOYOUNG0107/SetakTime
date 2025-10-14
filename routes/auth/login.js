const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('로그인 페이지입니다.');
});

router.post('/', (req, res) => {
    console.log(req.body);
    res.send('로그인 완료');
});

module.exports = router;
