document.addEventListener('DOMContentLoaded', () => {
    const reservationsList = document.getElementById('reservationsList');
    const noReservationsMessage = document.getElementById('noReservations');

    // 로그아웃 버튼 이벤트 리스너
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            window.location.href = '/logout';
        });
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