document.addEventListener('DOMContentLoaded', async () => {
    const reservationsList = document.getElementById('reservationsList');
    const noReservationsMessage = document.getElementById('noReservations');
    const userInfoDisplay = document.getElementById('userInfoDisplay');

    // 현재 로그인된 사용자 정보 가져오기
    try {
        const response = await fetch('/api/user-status');
        if (response.ok) {
            const user = await response.json();
            if (userInfoDisplay) {
                userInfoDisplay.textContent = `${user.username} (${user.role === 'student' ? '학생' : '선생님'})`;
            }
        } else {
            // 로그인 안된 상태면 로그인 페이지로 보냄
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
            return;
        }
    } catch (error) {
        console.error('사용자 정보를 가져오는 데 실패했습니다.', error);
        alert('오류가 발생했습니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/login.html';
        return;
    }

    async function fetchMyTodayReservations() {
        try {
            const response = await fetch('http://localhost:3000/reserve/my-reservations/today');
            if (!response.ok) {
                throw new Error('예약 정보를 불러오는 데 실패했습니다.');
            }
            const reservations = await response.json();

            if (reservations.length === 0) {
                noReservationsMessage.style.display = 'block';
            } else {
                reservationsList.innerHTML = ''; // 목록 초기화
                reservations.forEach(res => {
                    const listItem = document.createElement('li');
                    listItem.innerHTML = `
                        <span>세탁기 ${res.washer_id}번 - ${res.reservation_time.substring(0, 5)}</span>
                        <button class="cancel-button" data-id="${res.id}">취소</button>
                    `;
                    reservationsList.appendChild(listItem);
                });

                // 생성된 취소 버튼들에 이벤트 리스너 추가
                document.querySelectorAll('.cancel-button').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const reservationId = event.target.dataset.id;
                        if (confirm("정말로 이 예약을 취소하시겠습니까?")) {
                            try {
                                const response = await fetch(`http://localhost:3000/reserve/cancel/${reservationId}`, {
                                    method: 'DELETE'
                                });
                                if (response.ok) {
                                    alert('예약이 성공적으로 취소되었습니다.');
                                    fetchMyTodayReservations(); // 목록 새로고침
                                } else {
                                    const errorText = await response.text();
                                    alert(`취소 실패: ${errorText}`);
                                }
                            } catch (error) {
                                console.error('예약 취소 중 오류 발생:', error);
                                alert('예약 취소 중 오류가 발생했습니다.');
                            }
                        }
                    });
                });
            }
        } catch (error) {
            console.error(error);
            reservationsList.innerHTML = '<li>예약 정보를 불러오는 중 오류가 발생했습니다.</li>';
        }
    }

    fetchMyTodayReservations();
});