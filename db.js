require('dotenv').config();

// // 하드코딩된 URL 대신,
// // process.env.DB_URI로 변경하세요.
// const mongoose = require('mongoose');
// const dbURI = process.env.DB_URI; 

// mongoose.connect(dbURI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log('MongoDB에 성공적으로 연결되었습니다.'))
// .catch(err => console.error('MongoDB 연결 오류:', err));