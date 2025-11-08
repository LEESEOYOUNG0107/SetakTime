//2406_송민채: 학생 정보 추가, 정지, 삭제 기능 구현
let members = [
  {id: 1, studentNo: "406", name: "임소영", username: "lim_sso_", suspended: false},
  {id: 2, studentNo: "402", name: "송민채", username: "song_m_ch", suspended: false},
];

// 회원 테이블을 화면에 그리는 함수
function renderTable() {
  const tbody = document.querySelector("#memberTable tbody");
  tbody.innerHTML = "";
  members.forEach(m => {
    const tr = document.createElement("tr");
    if (m.suspended) tr.classList.add("suspended");
    tr.innerHTML = `
      <td>${m.id}</td>
      <td>${m.studentNo}</td>
      <td>${m.name}</td>
      <td>${m.username}</td>
      <td>
        <button onclick="deleteMember(${m.id})">삭제</button>
        <button onclick="suspendMember(${m.id})">정지</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 회원 삭제 함수
function deleteMember(id) {
  if (!confirm("정말 삭제할까요?")) return;
  members = members.filter(m => m.id !== id);
  renderTable();
}


// 회원 정지 함수
function suspendMember(id) {
  const days = prompt("몇 일 정지시킬까요?");
  if (!days || isNaN(days)) {
    alert("숫자를 입력해주세요.");
    return;
  }
  const member = members.find(m => m.id === id);
  if (member) {
    member.suspended = true;
    renderTable();
    alert(`${member.name}님이 ${days}일 정지되었습니다.`);
  }
}

window.onload = renderTable;
