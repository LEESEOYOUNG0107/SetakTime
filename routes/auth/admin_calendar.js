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

    // 캘린더 이벤트 렌더링 함수
    function renderEvents(dates, calendar) {
        dates.forEach(date => {
            calendar.addEvent({
                id: date, // 이벤트 ID를 날짜로 설정
                title: '예약 불가',
                start: date,
                allDay: true,
                backgroundColor: '#ff6b6b',
                borderColor: '#ff6b6b'
            });
        });
    }

    // 2. 캘린더 설정 및 DB 연동
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 600,
        locale: 'ko',
        // 페이지 로드 시 '예약 불가' 날짜들을 가져와 캘린더에 표시
        events: async function(fetchInfo, successCallback, failureCallback) {
            try {
                const response = await fetch('/admin/api/disabled-dates');
                const disabledDates = await response.json();
                const events = disabledDates.map(date => ({
                    id: date,
                    title: '예약 불가',
                    start: date,
                    allDay: true,
                    backgroundColor: '#ff6b6b',
                    borderColor: '#ff6b6b'
                }));
                successCallback(events);
            } catch (error) {
                console.error('예약 불가 날짜 로딩 실패:', error);
                failureCallback(error);
            }
        },
        dateClick: async function(info) {
            // 날짜를 클릭하면 항상 서버에 상태 변경(toggle)을 요청합니다.
            // 서버가 알아서 추가 또는 삭제를 결정합니다.
            try {
                const response = await fetch('/admin/api/disabled-dates/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: info.dateStr })
                });
                const result = await response.json();
                alert(result.message);
                
                // 서버 응답에 따라 화면을 갱신합니다.
                if (result.action === 'created') {
                     calendar.addEvent({
                        id: info.dateStr,
                        title: '예약 불가',
                        start: info.dateStr,
                        allDay: true,
                        backgroundColor: '#ff6b6b',
                        borderColor: '#ff6b6b'
                    });
                } else if (result.action === 'deleted') {
                    const event = calendar.getEventById(info.dateStr);
                    if (event) event.remove();
                }
            } catch (error) {
                alert(`작업 실패: ${error.message}`);
            }
        },
        eventClick: async function(info) {
            // '예약 불가' 이벤트를 클릭했을 때도 취소할 수 있도록 함
            // dateClick과 동일한 토글 로직을 사용합니다.
            const dateStr = info.event.startStr;
            try {
                const response = await fetch('/admin/api/disabled-dates/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: dateStr })
                });
                const result = await response.json();
                alert(result.message);

                // 서버 응답에 따라 화면을 갱신합니다. (삭제만 일어남)
                if (result.action === 'deleted') {
                    info.event.remove();
                }
            } catch (error) {
                alert(`작업 실패: ${error.message}`);
            }
        }
    });

    calendar.render(); // 캘린더를 화면에 렌더링합니다.
});