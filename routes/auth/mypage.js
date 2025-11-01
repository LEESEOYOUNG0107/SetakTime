document.addEventListener('DOMContentLoaded', () => {
    const reservationsList = document.getElementById('reservationsList');
    const noReservationsMessage = document.getElementById('noReservations');

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
                reservations.forEach(res => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `세탁기 ${res.washer_id}번 - ${res.reservation_time.substring(0, 5)}`;
                    reservationsList.appendChild(listItem);
                });
            }
        } catch (error) {
            console.error(error);
            reservationsList.innerHTML = '<li>예약 정보를 불러오는 중 오류가 발생했습니다.</li>';
        }
    }

    fetchMyTodayReservations();
});