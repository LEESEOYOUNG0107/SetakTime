document.addEventListener('DOMContentLoaded', async () => {
    // 0. 현재 로그인된 사용자 정보 가져오기 및 권한 확인
    let currentUser = null;
    try {
        const userStatusResponse = await fetch('http://localhost:3000/api/user-status');
        if (userStatusResponse.ok) {
            currentUser = await userStatusResponse.json();
            if (currentUser.role !== 'teacher') {
                alert('접근 권한이 없습니다.');
                window.location.href = '/';
                return;
            }
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
            return;
        }
    } catch (error) {
        console.error('사용자 정보 확인 중 오류:', error);
        alert('오류가 발생했습니다. 메인 페이지로 이동합니다.');
        window.location.href = '/';
        return;
    }

    // 헤더에 사용자 정보 표시
    const userInfoSpan = document.getElementById('userInfoDisplay');
    if (userInfoSpan) {
        userInfoSpan.textContent = `${currentUser.username} (선생님)`;
    }

    // 로그아웃 버튼 이벤트 리스너
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }

    // 2. 캘린더 설정
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 600,
        locale: 'ko',
        dateClick: function (info) {
            if (confirm(`${info.dateStr} 날짜를 예약 불가로 설정하시겠습니까?`)) {
                // 여기에 예약 불가 날짜를 DB에 저장하는 API 호출 로직을 추가할 수 있습니다.
                alert(`${info.dateStr}이 예약 불가로 설정되었습니다. (현재는 화면에만 표시)`);
                calendar.addEvent({
                    title: '예약 불가',
                    start: info.dateStr,
                    allDay: true,
                    backgroundColor: '#ff6b6b',
                    borderColor: '#ff6b6b'
                });
            }
        },
    });

    calendar.render(); // 캘린더를 화면에 렌더링합니다.
});